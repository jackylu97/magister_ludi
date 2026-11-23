import { describe, expect, it } from 'vitest';
import { aiConfigFor } from '../../src/ai/aiConfig';
import { foldTerms } from '../../src/ai/decision';
import { battlefield, enemyReach, threateningOrigin } from '../../src/ai/tactics/field';
import { cachedTacticalPlan } from '../../src/ai/tactics/memo';
import { planTacticalCombat } from '../../src/ai/tactics/planner';
import { unitTacticalTally } from '../../src/ai/tactics/metrics';
import { movementActions } from '../../src/ai/tactics/position';
import { sameTacticalDependencies, tacticalDependencies } from '../../src/ai/tactics/dependencies';
import { applyCommand } from '../../src/sim/commands';
import { snapshotState } from '../../src/sim/game';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { bumpPiecesOnly, bumpRevision, createUnit } from '../../src/sim/state';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import type { OrderId } from '../../src/sim/statecraftData';
import { newGame } from './newGameHelpers';

function board() {
  const state = newGame({ seed: 11, sizeName: 'duel', barbarians: false,
    players: [{ name: 'A', color: '#a00' }, { name: 'B', color: '#00a' }] });
  state.map = createMap({ width: 16, height: 12, terrain: 'grassland' });
  state.units = []; state.cities = []; state.camps = []; state.nextEntityId = 1;
  state.tileOwner = new Array(16 * 12).fill(null);
  resetVisibility(state); openWar(state, 0, 1);
  return state;
}

describe('per-unit tactical assessments', () => {
  it('takes a safe ranged shot and preserves the state and score breakdowns', () => {
    const state = board();
    const archer = createUnit(state, 0, 'archer', 4, 5);
    createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const before = snapshotState(state);
    const plan = planTacticalCombat(state, 0, archer.id, aiConfigFor())!;
    expect(plan.action).toMatchObject({ unitId: archer.id, kind: 'attack' });
    expect(plan.units).toEqual([archer.id]);
    for (const row of plan.candidates) expect(foldTerms(row.terms)).toBe(row.score);
    expect(snapshotState(state)).toBe(before);
    expect(applyCommand(state, plan.action.command!).ok).toBe(true);
  });

  it('plans a move followed by a ranged shot without searching other units', () => {
    const state = board();
    const archer = createUnit(state, 0, 'archer', 4, 5);
    createUnit(state, 0, 'spearman', 6, 5);
    createUnit(state, 1, 'warrior', 7, 5);
    recomputeAllVisibility(state);
    const plan = planTacticalCombat(state, 0, archer.id, aiConfigFor())!;
    expect(plan.sequence.map(action => action.kind)).toEqual(['move', 'attack']);
    for (const action of plan.sequence) expect(applyCommand(state, action.command!).ok).toBe(true);
  });

  it('keeps an essential melee garrison in place', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 1, 'warrior', 6, 5).hp = 1;
    recomputeAllVisibility(state);
    expect(planTacticalCombat(state, 0, spear.id, aiConfigFor(), { locked: [spear.id] })?.action.kind).toBe('hold');
  });

  it('fires while covering a worker instead of retreating and exposing it', () => {
    const state = board();
    const archer = createUnit(state, 0, 'archer', 5, 5);
    createUnit(state, 0, 'worker', 5, 5);
    createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const plan = planTacticalCombat(state, 0, archer.id, aiConfigFor())!;
    expect(plan.action.kind).toBe('attack');
    const exposed = plan.candidates.filter(candidate => candidate.label.startsWith(`${archer.id}: move`));
    expect(exposed.length).toBeGreaterThan(0);
    expect(exposed.some(candidate => candidate.terms.some(term => term.label.includes('Civilians') && term.value > 0))).toBe(true);
    expect(applyCommand(state, plan.action.command!).ok).toBe(true);
  });

  it('can remove the threat while protecting a civilian', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    spear.hp = 1;
    createUnit(state, 0, 'worker', 5, 5);
    createUnit(state, 1, 'warrior', 6, 5).hp = 1;
    recomputeAllVisibility(state);
    const plan = planTacticalCombat(state, 0, spear.id, aiConfigFor())!;
    expect(plan.action.kind).toBe('attack');
    const chosen = plan.candidates.find(candidate => candidate.chosen)!;
    expect(chosen.terms.some(term => term.label.includes('Civilians'))).toBe(false);
    expect(applyCommand(state, plan.action.command!).ok).toBe(true);
  });

  it('allows a last attack when waiting also loses the guard and civilian', () => {
    const state = board();
    for (const tile of state.map.tiles) tile.terrain = 'mountain';
    getTileAt(state.map, 5, 5)!.terrain = 'grassland';
    getTileAt(state.map, 6, 5)!.terrain = 'grassland';
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    warrior.hp = 19;
    createUnit(state, 0, 'worker', 5, 5);
    createUnit(state, 1, 'swordsman', 6, 5);
    recomputeAllVisibility(state);
    const plan = planTacticalCombat(state, 0, warrior.id, aiConfigFor())!;
    expect(plan.action.kind).toBe('attack');
    const held = plan.candidates.find(candidate => candidate.label.includes('hold'))!;
    expect(held.terms.some(term => term.label.includes('Civilians') && term.value > 0)).toBe(true);
  });

  it('keeps an alternate enemy origin without losing the cached first origin', () => {
    const state = board();
    const target = createUnit(state, 0, 'archer', 5, 5);
    const enemy = createUnit(state, 1, 'horseman', 8, 5);
    recomputeAllVisibility(state); state.visibility[0]!.fill(2);
    const field = battlefield(state, 0);
    const first = threateningOrigin(field, enemy, target)!;
    const next = threateningOrigin(field, enemy, target, origin =>
      origin.to.col !== first.to.col || origin.to.row !== first.to.row);
    expect(next).toBeDefined();
    expect(next).not.toBe(first);
    expect(threateningOrigin(field, enemy, target)).toBe(first);
  });

  it('does not change its decisions when hidden units change', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 1, 'warrior', 6, 5);
    const hidden = createUnit(state, 1, 'swordsman', 5, 6);
    recomputeAllVisibility(state);
    state.visibility[0]![tileIndex(state.map, 5, 6)] = 0;
    state.visibility[0]![tileIndex(state.map, 7, 6)] = 0;
    const first = planTacticalCombat(state, 0, spear.id, aiConfigFor());
    hidden.col = 7; hidden.hp = 1; bumpRevision(state);
    const next = planTacticalCombat(state, 0, spear.id, aiConfigFor());
    expect(next?.action).toEqual(first?.action);
    expect(next?.candidates).toEqual(first?.candidates);
  });

  it('reuses enemy paths after damage but refreshes them when occupancy changes', () => {
    const state = board();
    createUnit(state, 0, 'spearman', 5, 5);
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const first = enemyReach(battlefield(state, 0), enemy);
    enemy.hp -= 10; bumpPiecesOnly(state);
    expect(enemyReach(battlefield(state, 0), enemy)).toBe(first);
    enemy.row++; bumpPiecesOnly(state);
    expect(enemyReach(battlefield(state, 0), enemy)).not.toBe(first);
  });

  it('keeps distant mounted threats and rejects paths across impassable terrain', () => {
    const state = board();
    const archer = createUnit(state, 0, 'archer', 5, 5);
    const horse = createUnit(state, 1, 'horseman', 9, 5);
    for (const tile of state.map.tiles) tile.road = 0;
    recomputeAllVisibility(state); state.visibility[0]!.fill(2);
    expect(threateningOrigin(battlefield(state, 0), horse, archer)).toBeDefined();
    for (const tile of state.map.tiles) tile.terrain = 'mountain';
    getTileAt(state.map, 5, 5)!.terrain = 'grassland';
    getTileAt(state.map, 9, 5)!.terrain = 'grassland';
    bumpRevision(state);
    expect(threateningOrigin(battlefield(state, 0), horse, archer)).toBeUndefined();
  });

  it('reuses an unchanged local assessment and updates it after damage', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    const scout = createUnit(state, 0, 'scout', 12, 10);
    recomputeAllVisibility(state);
    const base = aiConfigFor();
    const ai = { ...base, tactics: { ...base.tactics, radius: 2 } };
    const first = cachedTacticalPlan(state, 0, spear.id, ai, {});
    scout.row--; bumpPiecesOnly(state);
    expect(cachedTacticalPlan(state, 0, spear.id, ai, {})).toBe(first);
    enemy.hp = 1; bumpPiecesOnly(state);
    const next = cachedTacticalPlan(state, 0, spear.id, ai, {});
    expect(next).not.toBe(first);
    expect(next?.action).toEqual(planTacticalCombat(state, 0, spear.id, ai)?.action);
  });

  it('keeps a weak melee unit out of an exposed finishing attack', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    spear.hp = 15;
    createUnit(state, 1, 'warrior', 6, 5).hp = 1;
    createUnit(state, 1, 'knight', 7, 5);
    createUnit(state, 1, 'knight', 7, 4);
    recomputeAllVisibility(state);
    const plan = planTacticalCombat(state, 0, spear.id, aiConfigFor())!;
    expect(plan.action.kind).not.toBe('attack');
  });

  it('distinguishes certain counter death from possible future attacks', () => {
    const state = board();
    for (const tile of state.map.tiles) tile.terrain = 'mountain';
    getTileAt(state.map, 5, 5)!.terrain = 'grassland';
    getTileAt(state.map, 6, 5)!.terrain = 'grassland';
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    warrior.hp = 19;
    createUnit(state, 1, 'swordsman', 6, 5);
    recomputeAllVisibility(state);
    const base = aiConfigFor();
    const ai = { ...base, tactics: { ...base.tactics, threatConfidence: 0.7 } };
    expect(planTacticalCombat(state, 0, warrior.id, ai)?.action.kind).toBe('hold');
    const certain = { ...ai, tactics: { ...ai.tactics, threatConfidence: 1 } };
    expect(planTacticalCombat(state, 0, warrior.id, certain)?.action.kind).toBe('attack');
  });

  it('traces blocked path cells without changing reachable destinations', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    const reads = new Set<number>();
    expect(movementActions(state, spear, 2, reads)).toEqual(movementActions(state, spear, 2));
    expect(reads.has(tileIndex(state.map, enemy.col, enemy.row))).toBe(true);
  });

  it('refreshes a path after a blocker leaves its previously blocked frontier', () => {
    const state = board();
    for (const tile of state.map.tiles) tile.terrain = 'mountain';
    for (let col = 4; col <= 10; col++) getTileAt(state.map, col, 5)!.terrain = 'grassland';
    const blocker = createUnit(state, 0, 'spearman', 6, 5);
    const target = createUnit(state, 0, 'archer', 8, 5);
    const enemy = createUnit(state, 1, 'horseman', 5, 5);
    recomputeAllVisibility(state); state.visibility[0]!.fill(2);
    const first = enemyReach(battlefield(state, 0), enemy);
    expect(first.origins.some(row => row.to.col === 7)).toBe(false);
    expect(threateningOrigin(battlefield(state, 0), enemy, target)).toBeUndefined();
    state.units = state.units.filter(row => row.id !== blocker.id); bumpPiecesOnly(state);
    const next = enemyReach(battlefield(state, 0), enemy);
    expect(next).not.toBe(first);
    expect(next.origins.some(row => row.to.col === 7)).toBe(true);
    expect(threateningOrigin(battlefield(state, 0), enemy, target)).toBeDefined();
  });

  it('remembers when a distant enemy does not require local tactics', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 1, 'warrior', 10, 5);
    recomputeAllVisibility(state); state.visibility[0]!.fill(2);
    const ai = aiConfigFor();
    expect(cachedTacticalPlan(state, 0, spear.id, ai, {})).toBeNull();
    const count = unitTacticalTally.assessments;
    expect(cachedTacticalPlan(state, 0, spear.id, ai, {})).toBeNull();
    expect(unitTacticalTally.assessments).toBe(count);
  });

  it('ignores spent enemy allowances only for the next-opportunity execution guard', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const command = { type: 'fortify' as const, playerId: 0, unitId: spear.id };
    const old = tacticalDependencies(state, 0, command, 4)!;
    const next = tacticalDependencies(state, 0, command, 4, undefined, true)!;
    enemy.movesLeft = 0; enemy.hasAttacked = true; enemy.firstAttackTurn = state.turn; bumpPiecesOnly(state);
    expect(sameTacticalDependencies(old, tacticalDependencies(state, 0, command, 4)!, id => id)).toBe(false);
    expect(sameTacticalDependencies(next, tacticalDependencies(state, 0, command, 4, undefined, true)!, id => id)).toBe(true);
    enemy.hp--; bumpPiecesOnly(state);
    expect(sameTacticalDependencies(next, tacticalDependencies(state, 0, command, 4, undefined, true)!, id => id)).toBe(false);
  });

  it('refreshes a cached assessment when a treasury-backed combat bonus changes', () => {
    const state = board();
    state.players[0]!.statecraft.slots.push({ card: 'warBonds' as OrderId, sealedUntil: state.turn });
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const ai = aiConfigFor();
    const first = cachedTacticalPlan(state, 0, spear.id, ai, {});
    state.players[0]!.gold += 100; bumpRevision(state);
    const next = cachedTacticalPlan(state, 0, spear.id, ai, {});
    expect(next).not.toBe(first);
    expect(next?.candidates).toEqual(planTacticalCombat(state, 0, spear.id, ai)?.candidates);
  });
});
