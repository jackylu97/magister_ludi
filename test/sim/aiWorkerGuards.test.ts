/**
 * **Soldiers guard a threatened worker** (bot batch BP13, `docs/flags.md`
 * (ooooooo), the bullet "BP13"; the user, 2026-11-16: *"the bots should have
 * logic to move soldiers to protect workers if they sense a hostile unit"*).
 *
 * The wild takes a civilian with no soldier on its own hex. These tests pin
 * the guard plan (`guardPlan`, `bot.ts`):
 *
 *   - a hostile the seat can see that could walk onto a worker's hex in its
 *     next move sends the nearest free soldier that can arrive first onto
 *     that hex, and the worker keeps working;
 *   - with no soldier able to come in time, the worker steps back to a town
 *     or a soldier;
 *   - a soldier already on the worker's hex holds there while the danger
 *     stands;
 *   - the danger is read off the hostile's own route, not the straight
 *     distance: a hostile two hexes off behind a ridge is no danger;
 *   - `workers.guardTurns` at nought turns the guards off.
 *
 * Each board is arranged by hand, `aiEscorts.test.ts`' bench, and every
 * command the file expects is put to the reducer.
 */

import { describe, expect, it } from 'vitest';

import { withAiTuning } from '../../src/ai/aiConfig';
import { botSitting, nextBotDecision } from '../../src/ai/bot';
import type { BotDecision } from '../../src/ai/decision';
import { foundCityAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { type GameState, type Unit, createUnit } from '../../src/sim/state';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { newGame } from './newGameHelpers';

/** A blank state on flat ground with two seats, `aiEscorts.test.ts`' bench. */
function bench(): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  const width = 24;
  const height = 12;
  state.map = createMap({ width, height, terrain: 'grassland' });
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

/** Seat 0's town at (4,5) with its garrison, holding the ground from column 1 to 9. */
function homeTown(state: GameState): void {
  const town = foundCityAt(state, 0, at(state.map, 4, 5));
  createUnit(state, 0, 'warrior', town.col, town.row);
  for (let col = 1; col <= 9; col++) {
    for (let row = 1; row <= 9; row++) state.tileOwner[tileIndex(state.map, col, row)] = town.id;
  }
}

/** Seat 0's decisions in one sitting, each put to the reducer. */
function sit(state: GameState, limit = 60): BotDecision[] {
  const sitting = botSitting(0);
  const sent: BotDecision[] = [];
  for (let step = 0; step < limit; step++) {
    const decision = nextBotDecision(state, 0, sitting);
    if (decision === null) break;
    const result = applyCommand(state, decision.command);
    expect(result.ok, `${decision.command.type}: ${result.ok ? '' : result.error}`).toBe(true);
    sent.push(decision);
  }
  return sent;
}

function about(sent: readonly BotDecision[], unit: Unit): BotDecision[] {
  return sent.filter((decision) => (decision.command as { unitId?: number }).unitId === unit.id);
}

describe('a soldier comes to a worker in danger', () => {
  it('the nearest free soldier marches onto the worker, and the worker works on', () => {
    const state = bench();
    homeTown(state);
    const worker = createUnit(state, 0, 'worker', 7, 5);
    const guard = createUnit(state, 0, 'warrior', 6, 3);
    openWar(state, 0, 1);
    createUnit(state, 1, 'warrior', 9, 5);
    recomputeAllVisibility(state);
    const sent = sit(state);
    const orders = about(sent, guard);
    expect(orders[0]?.command).toMatchObject({ type: 'moveUnit', target: { col: 7, row: 5 } });
    expect(orders[0]?.summary).toMatch(/^Guards /);
    expect(guard.col).toBe(7);
    expect(guard.row).toBe(5);
    for (const decision of about(sent, worker)) {
      expect(decision.summary).not.toMatch(/Steps back|runs the/);
    }
  });

  it('with no soldier to come, the worker steps back to its town', () => {
    const state = bench();
    homeTown(state);
    const worker = createUnit(state, 0, 'worker', 6, 5);
    openWar(state, 0, 1);
    createUnit(state, 1, 'warrior', 8, 5);
    recomputeAllVisibility(state);
    const [first] = about(sit(state), worker);
    expect(first?.command).toMatchObject({ type: 'moveUnit', target: { col: 4, row: 5 } });
    expect(first?.summary).toMatch(/^Steps back to its town/);
  });

  it('a soldier already on the worker\'s hex holds there while the danger stands', () => {
    const state = bench();
    homeTown(state);
    createUnit(state, 0, 'worker', 7, 5);
    const guard = createUnit(state, 0, 'warrior', 7, 5);
    openWar(state, 0, 1);
    createUnit(state, 1, 'warrior', 9, 5);
    recomputeAllVisibility(state);
    const [first] = about(sit(state), guard);
    expect(first?.command.type).toMatch(/sleepUnit|fortify/);
    expect(first?.summary).toMatch(/^Guards /);
    expect(guard.col).toBe(7);
  });
});

describe('the danger is the hostile\'s own route', () => {
  it('a hostile two hexes off behind a ridge is no danger', () => {
    const state = bench();
    homeTown(state);
    // A wall of mountains from the top of the map to the bottom at column 8.
    for (let row = 0; row < 12; row++) at(state.map, 8, row).terrain = 'mountain';
    const worker = createUnit(state, 0, 'worker', 7, 5);
    const spare = createUnit(state, 0, 'warrior', 6, 3);
    openWar(state, 0, 1);
    createUnit(state, 1, 'warrior', 9, 5);
    recomputeAllVisibility(state);
    const sent = sit(state);
    for (const decision of [...about(sent, worker), ...about(sent, spare)]) {
      expect(decision.summary).not.toMatch(/^Guards |^Steps back/);
    }
  });

  it('with `workers.guardTurns` at nought no worker steps back and no soldier guards', () => {
    const state = bench();
    homeTown(state);
    const worker = createUnit(state, 0, 'worker', 6, 5);
    openWar(state, 0, 1);
    createUnit(state, 1, 'warrior', 8, 5);
    recomputeAllVisibility(state);
    const sent = withAiTuning({ workers: { guardTurns: 0 } }, () => sit(state));
    for (const decision of about(sent, worker)) expect(decision.summary).not.toMatch(/^Steps back/);
    for (const decision of sent) expect(decision.summary).not.toMatch(/^Guards /);
  });
});
