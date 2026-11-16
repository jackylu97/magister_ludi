/**
 * **Escorts for settlers** (bot batch BP11, `docs/flags.md` (ooooooo), the
 * bullet "BP11"; the user, 2026-11-15: *"the ai should try to escort its
 * settler with military units"*).
 *
 * The wild takes a civilian that has no soldier on its own hex
 * (`isUnguarded`, `barbarians.ts`). Before BP11 the bot counted any soldier of
 * ours within four hexes as cover, so its settlers marched on with a raider
 * beside them. These tests pin the four parts of the fix:
 *
 *   - **cover** is a soldier on the civilian's own hex (`coverOn`);
 *   - **the departure**: a settler steps out of its town onto the hex of a
 *     soldier waiting beside it, waits in the town while one is on its way,
 *     and with none it leaves alone only when nothing hostile in sight stands
 *     near its road;
 *   - **the pair walks**: when the settler marches, its soldier walks after it
 *     in the same turn;
 *   - **the escort is the first garrison**: a settler about to found waits for
 *     the soldier that reaches its hex this turn.
 *
 * Each board is arranged by hand, `aiWar.test.ts`' bench, and every command the
 * file expects is put to the reducer.
 */

import { describe, expect, it } from 'vitest';

import { botSitting, escortJobs, nextBotDecision } from '../../src/ai/bot';
import type { BotDecision } from '../../src/ai/decision';
import { foundCityAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import type { TerrainId } from '../../src/sim/terrainData';
import { type GameState, type Unit, bumpRevision, createUnit } from '../../src/sim/state';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { newGame } from './newGameHelpers';

/** A blank state on flat ground with two seats, `aiWar.test.ts`' bench. */
function bench(
  { width = 24, height = 12, terrain = 'grassland' }: { width?: number; height?: number; terrain?: TerrainId } = {},
): GameState {
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

/**
 * Seat 0's decisions in one sitting, each put to the reducer, until the seat
 * has nothing left to say or `limit` decisions are sent.
 */
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

/** The decisions of `sent` about one piece. */
function about(sent: readonly BotDecision[], unit: Unit): BotDecision[] {
  return sent.filter((decision) => {
    const command = decision.command as { unitId?: number; settlerUnitId?: number };
    return command.unitId === unit.id || command.settlerUnitId === unit.id;
  });
}

/** A town of seat 0 on the west edge with its garrison, so every site lies east. */
function homeTown(state: GameState): { col: number; row: number } {
  const town = foundCityAt(state, 0, at(state.map, 2, 5));
  createUnit(state, 0, 'warrior', town.col, town.row);
  return { col: town.col, row: town.row };
}

describe('cover is a soldier on the civilian\'s own hex', () => {
  it('a soldier one hex off is not cover: the settler founds rather than march past a raider', () => {
    // Poor ground, so founding where it stands is the danger clause's answer
    // and not the ordinary one. Before BP11 the warrior beside it counted as
    // its escort, and the settler marched. The warrior stands with a second
    // settler, so it is not free to come.
    const state = bench({ terrain: 'desert' });
    const settler = createUnit(state, 0, 'settler', 10, 6);
    openWar(state, 0, 1);
    createUnit(state, 1, 'warrior', 13, 6);
    createUnit(state, 0, 'warrior', 11, 6);
    createUnit(state, 0, 'settler', 11, 6);
    recomputeAllVisibility(state);
    const first = nextBotDecision(state, 0);
    expect(first?.command).toMatchObject({ type: 'foundCity', settlerUnitId: settler.id });
    expect(first?.summary).toMatch(/nothing of ours walking with it/);
  });

  it('a soldier on its hex is cover: the same settler does not found in a hurry', () => {
    const state = bench({ terrain: 'desert' });
    const settler = createUnit(state, 0, 'settler', 10, 6);
    openWar(state, 0, 1);
    createUnit(state, 1, 'warrior', 13, 6);
    createUnit(state, 0, 'warrior', 10, 6);
    recomputeAllVisibility(state);
    const first = nextBotDecision(state, 0);
    expect(first?.summary ?? '').not.toMatch(/nothing of ours walking with it/);
    expect(escortJobs(state, 0)).toEqual([
      expect.objectContaining({ kind: 'hold', settlerId: settler.id }),
    ]);
  });
});

describe('a settler leaves its town with a soldier when it can', () => {
  it('steps out onto the hex of a free soldier waiting beside the town', () => {
    const state = bench();
    const town = homeTown(state);
    const escort = createUnit(state, 0, 'warrior', 4, 5);
    const settler = createUnit(state, 0, 'settler', town.col, town.row);
    recomputeAllVisibility(state);
    // The hex beside the town the plan sends the soldier to; stand it there.
    const [walking] = escortJobs(state, 0);
    expect(walking).toMatchObject({ kind: 'meet', settlerId: settler.id, soldierId: escort.id });
    escort.col = walking!.at.col;
    escort.row = walking!.at.row;
    bumpRevision(state);
    recomputeAllVisibility(state);
    expect(escortJobs(state, 0)).toEqual([
      { kind: 'meet', settlerId: settler.id, soldierId: escort.id, at: walking!.at, turns: 0 },
    ]);
    const sent = sit(state);
    const orders = about(sent, settler);
    expect(orders[0]?.command).toMatchObject({ type: 'moveUnit', target: walking!.at });
    expect(orders[0]?.summary).toMatch(/Steps out of/);
    // The soldier waited for it there, and did not walk off before it came.
    expect(about(sent, escort)[0]?.summary).toMatch(/Waits beside/);
  });

  it('waits in the town while a free soldier is on its way, and the plan sends that soldier', () => {
    const state = bench();
    const town = homeTown(state);
    const escort = createUnit(state, 0, 'warrior', 4, 5);
    const settler = createUnit(state, 0, 'settler', town.col, town.row);
    recomputeAllVisibility(state);
    const [job] = escortJobs(state, 0);
    expect(job).toMatchObject({ kind: 'meet', settlerId: settler.id, soldierId: escort.id });
    expect(job!.turns).toBeGreaterThanOrEqual(1);
    const sent = sit(state);
    expect(about(sent, settler)[0]?.command.type).toBe('sleepUnit');
    expect(about(sent, settler)[0]?.summary).toMatch(/Waits in .* for Warrior/);
    expect(about(sent, escort)[0]?.command).toMatchObject({ type: 'moveUnit', target: job!.at });
  });

  it('with no soldier to spare, waits while something hostile stands near its road', () => {
    const state = bench();
    const town = homeTown(state);
    const settler = createUnit(state, 0, 'settler', town.col, town.row);
    openWar(state, 0, 1);
    // Columns two hexes from the town all round it, in sight of its garrison,
    // so every road out passes within `expansion.roadDangerRadius` of one.
    for (const [col, row] of [[2, 3], [4, 4], [4, 6], [2, 7], [0, 6], [0, 4]] as const) {
      createUnit(state, 1, 'warrior', col, row);
    }
    recomputeAllVisibility(state);
    const sent = sit(state);
    const orders = about(sent, settler);
    // It stays in the town: every site's road passes the column, so either the
    // march arm strikes them all or the departure rule holds it.
    expect(orders[0]?.command.type).toBe('sleepUnit');
    expect(orders.some((decision) => decision.command.type === 'moveUnit')).toBe(false);
    const still = state.units.find((unit) => unit.id === settler.id)!;
    expect({ col: still.col, row: still.row }).toEqual(town);
  });

  it('with no soldier to spare and nothing hostile in sight, leaves alone', () => {
    const state = bench();
    const town = homeTown(state);
    const settler = createUnit(state, 0, 'settler', town.col, town.row);
    recomputeAllVisibility(state);
    const orders = about(sit(state), settler);
    expect(orders[0]?.command.type).toBe('moveUnit');
    expect(orders[0]?.summary).toMatch(/No soldier of ours can walk with it/);
  });
});

describe('the pair walks together', () => {
  it('when the settler marches, its soldier walks after it in the same turn', () => {
    const state = bench();
    homeTown(state);
    const settler = createUnit(state, 0, 'settler', 4, 5);
    const escort = createUnit(state, 0, 'warrior', 4, 5);
    recomputeAllVisibility(state);
    const sent = sit(state);
    const march = about(sent, settler).find((decision) => decision.command.type === 'moveUnit');
    expect(march, 'the settler marches').toBeDefined();
    // Wherever the settler stopped, its soldier stands with it before the turn ends.
    const now = state.units.find((unit) => unit.id === settler.id);
    const soldier = state.units.find((unit) => unit.id === escort.id)!;
    if (now !== undefined) expect({ col: soldier.col, row: soldier.row }).toEqual({ col: now.col, row: now.row });
    else expect(state.cities.some((city) => city.col === soldier.col && city.row === soldier.row)).toBe(true);
  });
});

describe('the escort is the first garrison', () => {
  it('a settler about to found waits for the soldier that reaches it this turn, then founds with it', () => {
    // Poor ground all round, so the settler founds where it stands.
    const state = bench({ terrain: 'desert' });
    const settler = createUnit(state, 0, 'settler', 12, 6);
    const escort = createUnit(state, 0, 'warrior', 13, 6);
    recomputeAllVisibility(state);
    expect(escortJobs(state, 0)).toEqual([
      expect.objectContaining({ kind: 'chase', settlerId: settler.id, soldierId: escort.id, turns: 1 }),
    ]);
    const sent = sit(state);
    const orders = about(sent, settler);
    expect(orders.map((decision) => decision.command.type)).toContain('foundCity');
    const town = state.cities.find((city) => city.ownerId === 0);
    expect(town, 'a town was founded').toBeDefined();
    const soldier = state.units.find((unit) => unit.id === escort.id)!;
    expect({ col: soldier.col, row: soldier.row }).toEqual({ col: town!.col, row: town!.row });
  });
});

/**
 * **Bot batch BP12: the settlers that waited for ever** (`docs/flags.md`
 * (ooooooo), the bullet "BP12"). The trace (the plan file's section "BP12")
 * found settlers asleep in their towns for a dozen turns on average, most of
 * them because every site near them had a hostile near it and no soldier came
 * to walk with them. Three faults in the escort, each pinned here, and the
 * build rule that a waiting settler is no reason to raise another.
 */
describe('a settler that waits gets its escort (bot batch BP12)', () => {
  /** Enemy columns two hexes from the town all round it, so no site or road out is safe alone. */
  function ringOfColumns(state: GameState): void {
    openWar(state, 0, 1);
    for (const [col, row] of [[2, 3], [4, 4], [4, 6], [2, 7], [0, 6], [0, 4]] as const) {
      createUnit(state, 1, 'warrior', col, row);
    }
  }

  it('steps out to the soldier beside its town even when no site is safe alone', () => {
    const state = bench();
    const town = homeTown(state);
    ringOfColumns(state);
    const settler = createUnit(state, 0, 'settler', town.col, town.row);
    const escort = createUnit(state, 0, 'warrior', 4, 5);
    recomputeAllVisibility(state);
    const [walking] = escortJobs(state, 0);
    expect(walking).toMatchObject({ kind: 'meet', settlerId: settler.id, soldierId: escort.id });
    escort.col = walking!.at.col;
    escort.row = walking!.at.row;
    bumpRevision(state);
    recomputeAllVisibility(state);
    // Before BP12 the settler weighed the sites as a settler alone, struck
    // every one of them, and slept with its soldier waiting beside it.
    const orders = about(sit(state), settler);
    expect(orders[0]?.command).toMatchObject({ type: 'moveUnit', target: walking!.at });
    expect(orders[0]?.summary).toMatch(/Steps out of/);
  });

  it('calls a soldier from further off once it already sleeps in its town', () => {
    const state = bench({ width: 30 });
    const town = homeTown(state);
    const settler = createUnit(state, 0, 'settler', town.col, town.row);
    // A free soldier about four turns' walk from the town.
    const far = createUnit(state, 0, 'warrior', 11, 5);
    recomputeAllVisibility(state);
    // Just raised, the settler waits only `expansion.escortWaitTurns`: no job.
    expect(escortJobs(state, 0)).toEqual([]);
    settler.sleeping = true;
    bumpRevision(state);
    const [job] = escortJobs(state, 0);
    expect(job).toMatchObject({ kind: 'meet', settlerId: settler.id, soldierId: far.id });
    expect(job!.turns).toBeGreaterThan(2);
  });

  it('still leaves alone on a safe road while a soldier called from further off is on its way', () => {
    const state = bench({ width: 30 });
    const town = homeTown(state);
    const settler = createUnit(state, 0, 'settler', town.col, town.row);
    settler.sleeping = true;
    createUnit(state, 0, 'warrior', 11, 5);
    recomputeAllVisibility(state);
    const [job] = escortJobs(state, 0);
    expect(job!.turns).toBeGreaterThan(2);
    const orders = about(sit(state), settler);
    expect(orders[0]?.command.type).toBe('moveUnit');
    expect(orders[0]?.summary).toMatch(/Leaves alone/);
  });

  it('waits for the soldier called from further off when it cannot leave alone', () => {
    const state = bench({ width: 30 });
    const town = homeTown(state);
    ringOfColumns(state);
    const settler = createUnit(state, 0, 'settler', town.col, town.row);
    settler.sleeping = true;
    const far = createUnit(state, 0, 'warrior', 11, 5);
    recomputeAllVisibility(state);
    const [job] = escortJobs(state, 0);
    expect(job).toMatchObject({ kind: 'meet', settlerId: settler.id, soldierId: far.id });
    const sent = sit(state);
    expect(about(sent, settler).some((decision) => decision.command.type === 'moveUnit')).toBe(false);
    expect(about(sent, far)[0]?.command).toMatchObject({ type: 'moveUnit', target: job!.at });
  });

  it('a town short of its garrison keeps its nearest soldier, and the others may still walk with a settler', () => {
    const state = bench({ width: 30 });
    const town = homeTown(state);
    // A second town far off with no soldier in it, and the soldier nearest it.
    const empty = foundCityAt(state, 0, at(state.map, 20, 5));
    const nearEmpty = createUnit(state, 0, 'warrior', 18, 5);
    const settler = createUnit(state, 0, 'settler', town.col, town.row);
    const escort = createUnit(state, 0, 'warrior', 4, 5);
    recomputeAllVisibility(state);
    expect(empty.ownerId).toBe(0);
    // Before BP12 one town short of its garrison stopped every escort.
    const jobs = escortJobs(state, 0);
    expect(jobs).toEqual([expect.objectContaining({ kind: 'meet', settlerId: settler.id, soldierId: escort.id })]);
    expect(jobs.some((job) => job.soldierId === nearEmpty.id)).toBe(false);
  });
});
