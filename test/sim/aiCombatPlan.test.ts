/** A legal attack must still use the combat facts the bot selected. */
import { describe, expect, it } from 'vitest';
import { driveBots } from '../../src/ai/driver';
import { aiTuning, withAiTuning } from '../../src/ai/aiConfig';
import { applyNextStep, askForCommands, freezeBoard, planSeat, startPlanRun } from '../../src/ai/frozenBoard';
import { foundCityAt } from '../../src/sim/cities';
import { applyCommand, type Command } from '../../src/sim/commands';
import { isFortified, previewCombat } from '../../src/sim/combat';
import { snapshotState } from '../../src/sim/game';
import { createMap, getTileAt } from '../../src/sim/map';
import { bumpRevision, createUnit, playerById, unitById, type GameState } from '../../src/sim/state';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { createGame } from './newGameHelpers';
import { openEveryWar } from './warHelpers';
import { driveWithBotsThinking } from '../ui/botWorkerHelpers';

function front() {
  const game = createGame({ seed: 48017, sizeName: 'duel', barbarians: false, players: [
    { name: 'Earlier seat', color: '#aa0000' },
    { name: 'Later seat', color: '#00aa00' },
    { name: 'Target seat', color: '#0000aa' },
  ] });
  const state = game.state;
  state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.tileOwner = new Array<number | null>(120).fill(null);
  state.nextEntityId = 1;
  resetVisibility(state);
  const towns = [[9, 1], [1, 1], [9, 8]].map(([col, row], playerId) =>
    foundCityAt(state, playerId, getTileAt(state.map, col!, row!)!));
  openEveryWar(state);
  const attacker = createUnit(state, 1, 'warrior', 4, 4);
  attacker.hp = 51;
  const defender = createUnit(state, 2, 'spearman', 5, 4);
  defender.hp = 1;
  const earlier = createUnit(state, 0, 'swordsman', 5, 5);
  const spare = createUnit(state, 1, 'warrior', 3, 2);
  recomputeAllVisibility(state);
  bumpRevision(state);
  const command: Extract<Command, { type: 'attack' }> = {
    type: 'attack', playerId: 1, unitId: attacker.id, target: { col: 5, row: 4 },
  };
  return { game, state, towns, attacker, defender, earlier, spare, command };
}

function oneAttack(state: GameState, command: Extract<Command, { type: 'attack' }>, tacticalOrigin?: { col: number; row: number }) {
  let asked = false;
  // Test the original combat guard unless the case selects tactical guards.
  return withAiTuning({ tactics: { enabled: 0 }, ...aiTuning() }, () => planSeat(freezeBoard(state), command.playerId, {
    ask: () => {
      if (asked) return null;
      asked = true;
      return { command, decision: tacticalOrigin ? {
        kind: 'unitOrder', command, subject: 'Test group', summary: 'Tests the group origin.', candidates: [], tacticalOrigin,
      } : null };
    },
    warn: message => { throw Error(message); },
  }));
}

function checkCut(state: GameState, run: ReturnType<typeof startPlanRun>, reason: 'combat' | 'unmapped') {
  const before = snapshotState(state);
  let dispatched = false;
  expect(applyNextStep(state, run, command => {
    dispatched = true;
    return applyCommand(state, command);
  })).toBeNull();
  expect(dispatched).toBe(false);
  expect(run.cut).toBe(reason);
  expect(run.guards.accepted).toBe(0);
  expect(run.guards.refused).toBe(0);
  expect(snapshotState(state)).toBe(before);
}

describe('planned combat facts', () => {
  it('keeps identical tactical guards when the regular game drops the explanations', () => {
    withAiTuning({ tactics: { enabled: 1, perUnit: 1 } }, () => {
      const { state } = front();
      const board = freezeBoard(state);
      const explained = planSeat(board, 1);
      const compact = planSeat(board, 1, { ask: askForCommands() });
      expect(explained.steps.some(step => step.decision?.tacticalOrigin !== undefined)).toBe(true);
      expect(compact.steps.every(step => step.decision === null)).toBe(true);
      expect(compact.steps.map(step => step.command)).toEqual(explained.steps.map(step => step.command));
      expect(compact.steps.map(step => step.tactics)).toEqual(explained.steps.map(step => step.tactics));
    });
  });

  it('keeps a per-unit plan when only an enemy attack allowance was spent', () => {
    withAiTuning({ tactics: { enabled: 1, perUnit: 1 } }, () => {
      const { state, command, defender } = front();
      const actor = unitById(state, command.unitId)!;
      const plan = oneAttack(state, command, { col: actor.col, row: actor.row });
      expect(plan.steps[0]?.tactics?.fullEnemyAllowance).toBe(true);
      defender.movesLeft = 0;
      defender.hasAttacked = true;
      bumpRevision(state);
      const run = startPlanRun(plan);
      expect(applyNextStep(state, run, order => applyCommand(state, order))?.result.ok).toBe(true);
      expect(run.cut).toBeNull();
    });
  });

  it('keeps the group origin when a different unit acts first', () => {
    withAiTuning({ tactics: { enabled: 1, radius: 2 } }, () => {
      const { state, command } = front();
      const other = createUnit(state, 2, 'archer', 8, 4);
      // The group saw this enemy, outside the acting unit's small footprint.
      state.visibility[1]!.fill(2);
      const plan = oneAttack(state, command, { col: 6, row: 4 });
      expect(plan.steps[0]?.tactics?.units.some(unit => unit.id === other.id)).toBe(true);
      other.row = 5;
      bumpRevision(state);
      checkCut(state, startPlanRun(plan), 'combat');
    });
  });
  it('uses the same tactical commands through the page and worker paths', () => {
    withAiTuning({ tactics: { enabled: 1 } }, () => {
      const page = front().game;
      const worker = front().game;
      for (const game of [page, worker]) {
        for (const player of game.state.players) player.isHuman = false;
        createUnit(game.state, 1, 'archer', 3, 4);
        recomputeAllVisibility(game.state);
      }
      driveWithBotsThinking(page, 'page');
      expect(driveWithBotsThinking(worker, 'worker')).toBe('applied');
      expect(worker.log).toEqual(page.log);
      expect(snapshotState(worker.state)).toBe(snapshotState(page.state));
      expect(page.log.some(command => command.type === 'attack')).toBe(true);
    });
  });
  it('replans a tactical action when another nearby enemy changes position', () => {
    withAiTuning({ tactics: { enabled: 1 } }, () => {
      const { state, command } = front();
      const other = createUnit(state, 2, 'archer', 6, 4);
      recomputeAllVisibility(state);
      const plan = oneAttack(state, command);
      expect(plan.steps[0]?.tactics).not.toBeNull();
      other.col = 6;
      other.row = 5;
      bumpRevision(state);
      checkCut(state, startPlanRun(plan), 'combat');
    });
  });

  it('keeps a tactical plan after an unrelated bank payment', () => {
    withAiTuning({ tactics: { enabled: 1 } }, () => {
      const { state, command } = front();
      const plan = oneAttack(state, command);
      state.players[0]!.gold += 3;
      bumpRevision(state);
      const run = startPlanRun(plan);
      const landed = applyNextStep(state, run, order => applyCommand(state, order));
      expect(landed).not.toBeNull();
      expect(run.cut).toBeNull();
    });
  });

  it('cuts a still-legal attack after a different enemy advances onto the target', () => {
    const { state, command, defender, earlier } = front();
    const plan = oneAttack(state, command);
    expect(plan.steps[0]?.combat).toMatchObject({ unitId: defender.id, ownerId: 2, phase: null });
    expect(applyCommand(state, { type: 'attack', playerId: 0, unitId: earlier.id, target: command.target }).ok).toBe(true);
    expect(previewCombat(state, command.unitId, command.target)).toMatchObject({ ok: true, defenderUnitId: earlier.id });
    checkCut(state, startPlanRun(plan), 'combat');
  });

  it('keeps a valid attack after an unrelated bank changes', () => {
    const { state, command, defender } = front();
    const plan = oneAttack(state, command);
    playerById(state, 0)!.gold += 100;
    bumpRevision(state);
    const run = startPlanRun(plan);
    expect(applyNextStep(state, run, one => applyCommand(state, one))?.result.ok).toBe(true);
    expect(run.cut).toBeNull();
    expect(unitById(state, defender.id)).toBeUndefined();
  });

  it.each(['attacker', 'defender'] as const)('replans after an earlier shot changes the %s health', side => {
    const { state, command, attacker, defender, earlier } = front();
    defender.hp = 100;
    earlier.type = 'archer';
    recomputeAllVisibility(state);
    bumpRevision(state);
    const plan = oneAttack(state, command);
    const hit = side === 'attacker' ? attacker : defender;
    const hp = hit.hp;
    expect(applyCommand(state, {
      type: 'attack', playerId: earlier.ownerId, unitId: earlier.id,
      target: { col: hit.col, row: hit.row },
    }).ok).toBe(true);
    expect(hit.hp).toBeGreaterThan(0);
    expect(hit.hp).toBeLessThan(hp);
    expect(previewCombat(state, command.unitId, command.target)).toMatchObject({ ok: true, defenderUnitId: defender.id });
    const run = startPlanRun(plan);
    checkCut(state, run, 'combat');
    expect(run.error).toBe('health or strength changed');
  });

  it('replans when a defending archer leaves its fortified stance to fire', () => {
    const { state, command, attacker, defender, earlier } = front();
    defender.type = 'archer';
    defender.hp = 100;
    defender.fortified = true;
    recomputeAllVisibility(state);
    bumpRevision(state);
    const plan = oneAttack(state, command);
    expect(applyCommand(state, {
      type: 'attack', playerId: defender.ownerId, unitId: defender.id,
      target: { col: earlier.col, row: earlier.row },
    }).ok).toBe(true);
    expect(attacker.hp).toBe(plan.steps[0]!.combat!.attackerHp);
    expect(defender.hp).toBe(plan.steps[0]!.combat!.defenderHp);
    const actual = previewCombat(state, attacker.id, command.target);
    expect(actual.ok).toBe(true);
    expect(actual.ok && actual.defenderStrength).not.toBe(plan.steps[0]!.combat!.defenderStrength);
    const run = startPlanRun(plan);
    checkCut(state, run, 'combat');
    expect(run.error).toBe('health or strength changed');
  });

  it('cuts when the same city changes from standing walls to an empty capture', () => {
    const { state, attacker, towns, command } = front();
    const city = towns[0]!;
    attacker.col = city.col - 1;
    attacker.row = city.row;
    const attack = { ...command, target: { col: city.col, row: city.row } };
    recomputeAllVisibility(state);
    bumpRevision(state);
    expect(previewCombat(state, attacker.id, city)).toMatchObject({ ok: true, cityPhase: 'walls' });
    const plan = oneAttack(state, attack);
    city.hp = 1;
    bumpRevision(state);
    expect(previewCombat(state, attacker.id, city)).toMatchObject({ ok: true, cityPhase: 'capture' });
    checkCut(state, startPlanRun(plan), 'combat');
    expect(city.ownerId).toBe(0);
  });

  it('maps a newly created defender through the same id table as commands', () => {
    const { state, command, defender } = front();
    const plan = oneAttack(state, command);
    // Model a target created by an earlier accepted command on the copy.
    plan.firstNewId = defender.id;
    const actualId = state.nextEntityId++;
    state.units = state.units.map(unit => unit.id === defender.id ? { ...unit, id: actualId } : unit);
    bumpRevision(state);
    const run = startPlanRun(plan);
    run.ids.set(defender.id, actualId);
    expect(applyNextStep(state, run, one => applyCommand(state, one))?.result.ok).toBe(true);
    expect(run.cut).toBeNull();
    expect(unitById(state, actualId)).toBeUndefined();
  });

  it('does not guess a new defender id when its mapping is missing', () => {
    const { state, command, defender } = front();
    const plan = oneAttack(state, command);
    plan.firstNewId = defender.id;
    checkCut(state, startPlanRun(plan), 'unmapped');
  });

  it('replans from the live board and still orders the remaining unit', () => {
    const { game, attacker, defender, earlier, spare, command } = front();
    const warnings: string[] = [];
    const reports = driveBots(game, {
      decide: (state, playerId) => {
        if (playerId === 0 && unitById(state, defender.id) && !unitById(state, earlier.id)?.hasAttacked) {
          return { type: 'attack', playerId, unitId: earlier.id, target: command.target };
        }
        if (playerId !== 1) return null;
        const mine = unitById(state, attacker.id)!;
        if (!mine.hasAttacked && !isFortified(mine)) {
          return unitById(state, defender.id) ? command : { type: 'fortify', playerId, unitId: mine.id };
        }
        const other = unitById(state, spare.id)!;
        return isFortified(other) ? null : { type: 'fortify', playerId, unitId: other.id };
      },
      warn: message => warnings.push(message),
    });
    expect(warnings).toEqual([]);
    expect(reports.find(report => report.playerId === 1)).toMatchObject({ cut: 'combat', ended: true, refused: 0 });
    expect(game.log.some(one => one.type === 'attack' && one.playerId === 1)).toBe(false);
    for (const id of [attacker.id, spare.id]) {
      expect(game.log.some(one => one.type === 'fortify' && one.unitId === id)).toBe(true);
    }
    expect([attacker.col, attacker.row]).toEqual([4, 4]);
  });
});
