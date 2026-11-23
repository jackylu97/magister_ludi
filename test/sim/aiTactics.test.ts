import { describe, expect, it } from 'vitest';
import { aiConfigFor } from '../../src/ai/aiConfig';
import { foldTerms } from '../../src/ai/decision';
import { planTacticalCombat } from '../../src/ai/tactics/planner';
import { cachedTacticalPlan } from '../../src/ai/tactics/memo';
import { enemyReply, type TacticalContext } from '../../src/ai/tactics/assessment';
import { sameTacticalDependencies, tacticalDependencies } from '../../src/ai/tactics/dependencies';
import { attackAction, distance, holdAction, initialPosition, movementActions, projectAction } from '../../src/ai/tactics/position';
import { combatContinuation, previewCombatRisk, previewCombatSample } from '../../src/sim/combat';
import { controlledHoldings, foundCityAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { restoreState, snapshotState } from '../../src/sim/game';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { bumpPiecesOnly, bumpRevision, createUnit, type GameState } from '../../src/sim/state';
import { inheritGroundReadings, setSlateShadow, slateMemo, slateShadow } from '../../src/sim/slate';
import { reachableTiles } from '../../src/sim/pathfind';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import type { DoctrineId, OrderId } from '../../src/sim/statecraftData';
import { newGame } from './newGameHelpers';

function groupConfig() {
  const ai = aiConfigFor();
  return { ...ai, tactics: { ...ai.tactics, perUnit: 0 } };
}

function board(): GameState {
  const state = newGame({ seed: 11, sizeName: 'duel', barbarians: false, players: [
    { name: 'A', color: '#a00' }, { name: 'B', color: '#00a' },
  ] });
  state.map = createMap({ width: 16, height: 12, terrain: 'grassland' });
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.tileOwner = new Array(16 * 12).fill(null);
  resetVisibility(state);
  openWar(state, 0, 1);
  return state;
}

function replyContext(state: GameState, mine: number, enemy: number): TacticalContext {
  return {
    root: state, playerId: 0, units: [mine], enemies: [enemy], cities: [], protectedUnits: [], locked: [],
    ai: groupConfig(), worth: new Map([[mine, 1], [enemy, 1]]),
    stats: { positions: 0, forecasts: 0, replies: 0, cacheHits: 0, limited: false },
  };
}

describe('shared tactical positions', () => {
  it('reuses ground indexes without sharing unit-dependent readings', () => {
    const state = board();
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    const held = controlledHoldings(state, 0, 'luxury');
    slateMemo(state, 'economy', 'testUnitCount', '', () => state.units.length);
    const projection = { ...state, units: [] };
    inheritGroundReadings(state, projection);
    expect(controlledHoldings(projection, 0, 'luxury')).toBe(held);
    expect(slateMemo(projection, 'economy', 'testUnitCount', '', () => projection.units.length)).toBe(0);
    const changed = { ...state, cities: [...state.cities] };
    inheritGroundReadings(state, changed);
    expect(controlledHoldings(changed, 0, 'luxury')).not.toBe(held);
    expect(state.units[0]).toBe(mine);
  });

  it('omits swap planning without changing the ordinary reachable destinations', () => {
    const state = board();
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 0, 'spearman', 6, 5);
    expect(reachableTiles(state, mine, { swaps: false })).toEqual(reachableTiles(state, mine).filter(row => !row.swap));
  });

  it('bounds a road search by hex distance and keeps movement prices across the map seam', () => {
    const state = board();
    const mine = createUnit(state, 0, 'horseman', 0, 5);
    for (const tile of state.map.tiles) tile.road = 0;
    const full = movementActions(state, mine);
    const local = movementActions(state, mine, 2);
    expect(full.some(action => distance(state, mine, action.to) > 2)).toBe(true);
    expect(local).toEqual(full.filter(action => distance(state, mine, action.to) <= 2));
    expect(local.some(action => action.to.col === 15 && action.to.row === 5)).toBe(true);
    const snapshot = snapshotState(state);
    for (const action of local) {
      const copy = restoreState(snapshot);
      expect(applyCommand(copy, action.command!).ok).toBe(true);
    }
  });

  it('carries repeated-attack strength and earned experience into a follow-up', () => {
    const state = board();
    state.players[0]!.statecraft.doctrines.push('weightOfNumbers' as DoctrineId);
    const first = createUnit(state, 0, 'archer', 5, 5);
    const second = createUnit(state, 0, 'archer', 6, 4);
    const enemy = createUnit(state, 1, 'spearman', 6, 5);
    recomputeAllVisibility(state);
    const before = previewCombatSample(state, second.id, enemy, 'middle');
    const projected = projectAction(initialPosition(state), attackAction(first, enemy))!.position.state;
    const after = previewCombatSample(projected, second.id, enemy, 'middle');
    expect(before.ok && after.ok && after.attackerStrength > before.attackerStrength).toBe(true);
    expect(projected.players[0]!.strikesThisTurn?.targets).toEqual([enemy.id]);
    expect(state.players[0]!.strikesThisTurn).toBeUndefined();
    expect(projected.units.find(unit => unit.id === first.id)?.experience).toBeGreaterThan(first.experience ?? 0);
    expect(projected.units.find(unit => unit.id === enemy.id)?.experience).toBeGreaterThan(enemy.experience ?? 0);
  });
  it('caps kill healing before taking the counter', () => {
    const state = board();
    state.players[0]!.statecraft.slots.push({ card: 'theOathBound' as OrderId, sealedUntil: state.turn });
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    mine.hp = 95;
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    enemy.hp = 1;
    recomputeAllVisibility(state);
    const result = previewCombatSample(state, mine.id, enemy, 'middle');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attackerHpAfter).toBe(result.attackerMaxHp - result.damageToAttacker);
  });

  it('gives a captured city the same restored walls as the real capture', () => {
    const state = board();
    const city = foundCityAt(state, 1, getTileAt(state.map, 6, 5)!);
    city.hp = 0;
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    recomputeAllVisibility(state);
    const action = attackAction(mine, city);
    const result = projectAction(initialPosition(state), action)!;
    expect(result.forecast?.capturedCityId).toBe(city.id);
    expect(applyCommand(state, action.command!).ok).toBe(true);
    expect(result.position.state.cities.find(row => row.id === city.id)?.hp).toBe(city.hp);
    expect(city.ownerId).toBe(0);
  });

  it('projects both sides of an uncertain kill without changing the state or random stream', () => {
    const state = board();
    const mine = createUnit(state, 0, 'warrior', 5, 5);
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const forecast = previewCombatRisk(state, mine.id, enemy);
    expect(forecast.ok).toBe(true);
    if (!forecast.ok) return;
    enemy.hp = forecast.damageToDefender;
    bumpRevision(state);
    const before = snapshotState(state);
    const low = previewCombatSample(state, mine.id, enemy, 'low');
    const high = previewCombatSample(state, mine.id, enemy, 'high');
    expect(low.ok && low.advances).toBe(false);
    expect(high.ok && high.advances).toBe(true);
    expect(snapshotState(state)).toBe(before);
  });

  it('uses the same attack budget as the resolver', () => {
    const state = board();
    const mine = createUnit(state, 0, 'warrior', 5, 5);
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const continuation = combatContinuation(state, mine, false);
    expect(applyCommand(state, { type: 'attack', playerId: 0, unitId: mine.id, target: enemy }).ok).toBe(true);
    expect(mine.movesLeft).toBe(continuation.movesLeft);
    expect(mine.hasAttacked).toBe(continuation.hasAttacked);
  });

  it('projects moving into range and then shooting with the remaining movement', () => {
    const state = board();
    const mine = createUnit(state, 0, 'archer', 4, 5);
    const enemy = createUnit(state, 1, 'warrior', 7, 5);
    createUnit(state, 0, 'scout', 8, 5);
    recomputeAllVisibility(state);
    const move = movementActions(state, mine).find(action => action.to.col === 5 && action.to.row === 5)!;
    const moved = projectAction(initialPosition(state), move)!.position;
    const actor = moved.state.units.find(unit => unit.id === mine.id)!;
    const attack = attackAction(actor, enemy);
    const projected = projectAction(moved, attack)!;
    expect(projected.forecast?.damageToDefender).toBeGreaterThan(0);
    expect(projected.position.actions.map(action => action.kind)).toEqual(['move', 'attack']);
    expect(applyCommand(state, move.command!).ok).toBe(true);
    expect(applyCommand(state, attack.command!).ok).toBe(true);
  });

  it('allows movement after an attack only when the unit has that ability', () => {
    const state = board();
    state.players[0]!.statecraft.slots.push({ card: 'theSwiftRiders' as OrderId, sealedUntil: state.turn });
    const mine = createUnit(state, 0, 'horseman', 5, 5);
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const attack = attackAction(mine, enemy);
    const projected = projectAction(initialPosition(state), attack)!.position;
    const actor = projected.state.units.find(unit => unit.id === mine.id)!;
    expect(actor.hasAttacked).toBe(true);
    expect(movementActions(projected.state, actor).length).toBeGreaterThan(0);
    expect(applyCommand(state, attack.command!).ok).toBe(true);
    expect(actor.movesLeft).toBe(mine.movesLeft);
  });

  it('stops after a conversion and keeps the winner out of the occupied tile', () => {
    const state = board();
    state.players[1]!.barbarian = true;
    state.players[0]!.statecraft.slots.push({ card: 'bloodBrothers' as OrderId, sealedUntil: state.turn });
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    enemy.hp = 1;
    recomputeAllVisibility(state);
    const result = projectAction(initialPosition(state), attackAction(mine, enemy))!;
    expect(result.forecast?.defenderConverted).toBe(true);
    expect(result.forecast?.advances).toBe(false);
    expect(result.position.terminal).toBe(true);
    expect(result.position.state.units.find(unit => unit.id === enemy.id)).toMatchObject({ ownerId: 0, hp: 100, movesLeft: 0 });
    expect(enemy.ownerId).toBe(1);
  });

  it('advances after a field kill and removes the defeated unit from later choices', () => {
    const state = board();
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    enemy.hp = 1;
    recomputeAllVisibility(state);
    const result = projectAction(initialPosition(state), attackAction(mine, enemy))!;
    expect(result.forecast?.advances).toBe(true);
    expect(result.position.state.units.find(unit => unit.id === mine.id)).toMatchObject({ col: 6, row: 5, movesLeft: 0 });
    expect(result.position.state.units.some(unit => unit.id === enemy.id)).toBe(false);
    expect(state.units).toHaveLength(2);
  });

  it('preserves fortification on a hold and breaks it on a move', () => {
    const state = board();
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    mine.fortifiedTurns = 2;
    mine.dugIn = 'awake';
    const root = initialPosition(state);
    const held = projectAction(root, holdAction(state, mine))!.position.state.units[0]!;
    expect(held.fortifiedTurns).toBe(2);
    expect(held.dugIn).toBeUndefined();
    const move = movementActions(state, mine)[0]!;
    const moved = projectAction(root, move)!.position.state.units[0]!;
    expect(moved.fortifiedTurns).toBeUndefined();
    expect(moved.movesLeft).toBeLessThan(mine.movesLeft);
    expect(mine.fortifiedTurns).toBe(2);
  });

  it('does not offer a friendly occupied destination as an ordinary move', () => {
    const state = board();
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    const friend = createUnit(state, 0, 'spearman', 6, 5);
    expect(movementActions(state, mine).some(action => action.to.col === friend.col && action.to.row === friend.row)).toBe(false);
  });
});

describe('bounded tactical planning', () => {
  it('skips reply searches for civilians and units that changed to our side', () => {
    const state = board();
    const mine = createUnit(state, 0, 'archer', 5, 5);
    const worker = createUnit(state, 1, 'worker', 6, 5);
    const converted = createUnit(state, 0, 'warrior', 6, 4);
    recomputeAllVisibility(state);
    const ctx = replyContext(state, mine.id, worker.id);
    ctx.enemies = [worker.id, converted.id];
    const reply = enemyReply(ctx, initialPosition(state), true);
    expect(reply.actions).toEqual([]);
    expect(ctx.stats.forecasts).toBe(0);
  });

  it('keeps mounted threats that move more than two hexes before attacking', () => {
    const state = board();
    for (const tile of state.map.tiles) tile.road = 0;
    const mine = createUnit(state, 0, 'archer', 5, 5);
    const enemy = createUnit(state, 1, 'horseman', 9, 5);
    enemy.movesLeft = 0;
    recomputeAllVisibility(state);
    state.visibility[0]!.fill(2);
    expect(planTacticalCombat(state, 0, mine.id, groupConfig())?.enemies).toContain(enemy.id);
    const ctx = replyContext(state, mine.id, enemy.id);
    const reply = enemyReply(ctx, initialPosition(state), true);
    expect(reply.actions.some(action => action.kind === 'move' && distance(state, action.from, action.to) > 2)).toBe(true);
    expect(reply.state.units.find(unit => unit.id === mine.id)?.hp ?? 0).toBeLessThan(mine.hp);
  });

  it('counts a ranged enemy outside the friendly movement radius', () => {
    const state = board();
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    const enemy = createUnit(state, 1, 'archer', 8, 5);
    enemy.movesLeft = 0;
    recomputeAllVisibility(state);
    const reply = enemyReply(replyContext(state, mine.id, enemy.id), initialPosition(state), true);
    expect(reply.actions.map(action => action.kind)).toEqual(['move', 'attack']);
    expect(reply.state.units.find(unit => unit.id === mine.id)?.hp).toBeLessThan(mine.hp);
  });

  it('does not turn geometric proximity across a barrier into an enemy attack', () => {
    const state = board();
    for (const tile of state.map.tiles) tile.terrain = 'mountain';
    getTileAt(state.map, 5, 5)!.terrain = 'grassland';
    getTileAt(state.map, 8, 5)!.terrain = 'grassland';
    const mine = createUnit(state, 0, 'archer', 5, 5);
    const enemy = createUnit(state, 1, 'horseman', 8, 5);
    recomputeAllVisibility(state);
    const reply = enemyReply(replyContext(state, mine.id, enemy.id), initialPosition(state), true);
    expect(reply.actions).toEqual([]);
    expect(reply.state.units.find(unit => unit.id === mine.id)?.hp).toBe(mine.hp);
  });

  it('finds a legal firing position when the first shot has blocked sight', () => {
    const state = board();
    const mine = createUnit(state, 0, 'archer', 7, 5);
    const enemy = createUnit(state, 1, 'archer', 5, 5);
    getTileAt(state.map, 6, 5)!.terrain = 'mountain';
    recomputeAllVisibility(state);
    expect(previewCombatSample(state, enemy.id, mine, 'middle').ok).toBe(false);
    const reply = enemyReply(replyContext(state, mine.id, enemy.id), initialPosition(state), true);
    expect(reply.actions.map(action => action.kind)).toEqual(['move', 'attack']);
    expect(reply.state.units.find(unit => unit.id === mine.id)?.hp).toBeLessThan(mine.hp);
  });

  it('reuses an unchanged local plan after a distant move, but not a local or economy change', () => {
    const state = board();
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    const enemy = createUnit(state, 1, 'warrior', 6, 5);
    const distant = createUnit(state, 0, 'scout', 12, 10);
    recomputeAllVisibility(state);
    const base = groupConfig();
    const ai = { ...base, tactics: { ...base.tactics, radius: 2 } };
    const first = cachedTacticalPlan(state, 0, mine.id, ai, {})!;
    distant.row = 9;
    bumpPiecesOnly(state);
    expect(cachedTacticalPlan(state, 0, mine.id, ai, {})).toBe(first);
    enemy.hp -= 10;
    bumpPiecesOnly(state);
    const changed = cachedTacticalPlan(state, 0, mine.id, ai, {});
    expect(changed).not.toBe(first);
    expect(changed?.action).toEqual(planTacticalCombat(state, 0, mine.id, ai)?.action);
    state.players[0]!.gold += 10;
    bumpRevision(state);
    expect(cachedTacticalPlan(state, 0, mine.id, ai, {})).not.toBe(changed);
  });

  it('does not move into a destination whose occupancy is hidden', () => {
    const state = board();
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 1, 'warrior', 7, 5);
    const hidden = createUnit(state, 1, 'spearman', 6, 5);
    recomputeAllVisibility(state);
    state.visibility[0]![tileIndex(state.map, hidden.col, hidden.row)] = 1;
    const plan = planTacticalCombat(state, 0, mine.id, groupConfig())!;
    for (const action of plan.sequence.filter(action => action.kind === 'move')) {
      expect(state.visibility[0]![tileIndex(state.map, action.to.col, action.to.row)]).toBe(2);
    }
    if (plan.action.command) expect(applyCommand(state, plan.action.command).ok).toBe(true);
  });
  it('takes a protected ranged shot before spending melee health', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    const archer = createUnit(state, 0, 'archer', 4, 5);
    createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const plan = planTacticalCombat(state, 0, spear.id, groupConfig())!;
    expect(plan.action.kind).toBe('attack');
    expect(plan.action.unitId).toBe(archer.id);
  });

  it('does not stop on a no-op hold when another fortified unit has a useful shot', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    const archer = createUnit(state, 0, 'archer', 4, 5);
    spear.fortifiedTurns = 2;
    archer.fortifiedTurns = 2;
    createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const plan = planTacticalCombat(state, 0, spear.id, groupConfig(), { locked: [spear.id] })!;
    expect(plan.action.command?.type).toBe('attack');
    expect(plan.action.unitId).toBe(archer.id);
  });

  it('does not assign two enemy melee attacks to the same occupied approach', () => {
    const state = board();
    for (const tile of state.map.tiles) tile.terrain = 'mountain';
    for (const col of [5, 6, 7, 8]) getTileAt(state.map, col, 5)!.terrain = 'grassland';
    const mine = createUnit(state, 0, 'archer', 5, 5);
    const first = createUnit(state, 1, 'spearman', 7, 5);
    const second = createUnit(state, 1, 'spearman', 8, 5);
    recomputeAllVisibility(state);
    const ctx: TacticalContext = {
      root: state, playerId: 0, units: [mine.id], enemies: [first.id, second.id], cities: [], protectedUnits: [], locked: [],
      ai: groupConfig(), worth: new Map([[mine.id, 1], [first.id, 1], [second.id, 1]]),
      stats: { positions: 0, forecasts: 0, replies: 0, cacheHits: 0, limited: false },
    };
    const reply = enemyReply(ctx, initialPosition(state), true);
    expect(reply.actions.filter(action => action.kind === 'attack')).toHaveLength(1);
    expect(reply.state.units.find(unit => unit.id === mine.id)?.hp).toBeGreaterThan(0);
  });

  it('keeps a wounded ally\'s retreat when a locked unit starts the group assessment', () => {
    const state = board();
    const guard = createUnit(state, 0, 'spearman', 5, 5);
    const wounded = createUnit(state, 0, 'spearman', 6, 5);
    wounded.hp = 20;
    const enemy = createUnit(state, 1, 'warrior', 7, 5);
    enemy.hp = 70;
    createUnit(state, 1, 'archer', 8, 5);
    recomputeAllVisibility(state);
    const plan = planTacticalCombat(state, 0, guard.id, groupConfig(), { locked: [guard.id] });
    expect(plan?.candidates.some(candidate => candidate.label.startsWith(`${wounded.id}: move `))).toBe(true);
    expect(plan?.action.unitId).toBe(wounded.id);
    expect(plan?.action.kind).toBe('move');
  });

  it('compares group actions, preserves the board and prints scores that fold exactly', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 0, 'archer', 4, 5);
    createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const before = snapshotState(state);
    const plan = planTacticalCombat(state, 0, spear.id, groupConfig())!;
    expect(plan).not.toBeNull();
    expect(plan.candidates.filter(row => row.chosen)).toHaveLength(1);
    for (const row of plan.candidates) expect(foldTerms(row.terms)).toBe(row.score);
    expect(plan.stats.positions).toBeLessThanOrEqual(groupConfig().tactics.projections);
    expect(snapshotState(state)).toBe(before);
    expect(planTacticalCombat(state, 0, spear.id, groupConfig())?.action).toEqual(plan.action);
    expect(plan.action.command).not.toBeNull();
    expect(applyCommand(state, plan.action.command!).ok).toBe(true);
  });

  it('matches fresh ground calculations throughout a local search', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 0, 'archer', 4, 5);
    createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const previous = slateShadow();
    setSlateShadow(true);
    try { expect(planTacticalCombat(state, 0, spear.id, groupConfig())).not.toBeNull(); }
    finally { setSlateShadow(previous); }
  });

  it('keeps a required melee garrison in place even when it can finish a target', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 1, 'warrior', 6, 5).hp = 1;
    recomputeAllVisibility(state);
    const plan = planTacticalCombat(state, 0, spear.id, groupConfig(), { locked: [spear.id] })!;
    expect(plan.action.kind).toBe('hold');
  });

  it('does not let a hidden unit change path choices or the score', () => {
    const state = board();
    const spear = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 1, 'warrior', 6, 5);
    const hidden = createUnit(state, 1, 'swordsman', 5, 6);
    recomputeAllVisibility(state);
    state.visibility[0]![tileIndex(state.map, hidden.col, hidden.row)] = 0;
    state.visibility[0]![tileIndex(state.map, 7, 6)] = 0;
    const first = planTacticalCombat(state, 0, spear.id, groupConfig());
    hidden.col = 7;
    hidden.row = 6;
    hidden.hp = 1;
    state.visibility[0]![tileIndex(state.map, hidden.col, hidden.row)] = 0;
    bumpRevision(state);
    const second = planTacticalCombat(state, 0, spear.id, groupConfig());
    expect(second?.action).toEqual(first?.action);
    expect(second?.candidates).toEqual(first?.candidates);
  });
});

describe('tactical dependencies at execution', () => {
  it('includes banked gold when an Order uses it for combat strength', () => {
    const state = board();
    state.players[0]!.statecraft.slots.push({ card: 'warBonds' as OrderId, sealedUntil: state.turn });
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    createUnit(state, 1, 'warrior', 6, 5);
    recomputeAllVisibility(state);
    const command = attackAction(mine, { col: 6, row: 5 }).command!;
    const before = tacticalDependencies(state, 0, command, 4)!;
    state.players[0]!.gold += 100;
    bumpRevision(state);
    expect(sameTacticalDependencies(before, tacticalDependencies(state, 0, command, 4)!, id => id)).toBe(false);
  });
  it('detects a nearby enemy move while ignoring a bank-only change', () => {
    const state = board();
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    const enemy = createUnit(state, 1, 'archer', 7, 5);
    recomputeAllVisibility(state);
    const command = { type: 'moveUnit' as const, playerId: 0, unitId: mine.id, target: { col: 6, row: 5 } };
    const before = tacticalDependencies(state, 0, command, 4)!;
    state.players[0]!.gold += 1;
    bumpRevision(state);
    expect(sameTacticalDependencies(before, tacticalDependencies(state, 0, command, 4)!, id => id)).toBe(true);
    enemy.col = 8;
    recomputeAllVisibility(state);
    bumpRevision(state);
    expect(sameTacticalDependencies(before, tacticalDependencies(state, 0, command, 4)!, id => id)).toBe(false);
  });

  it('detects a road change on a local path', () => {
    const state = board();
    const mine = createUnit(state, 0, 'spearman', 5, 5);
    recomputeAllVisibility(state);
    const command = { type: 'moveUnit' as const, playerId: 0, unitId: mine.id, target: { col: 7, row: 5 } };
    const before = tacticalDependencies(state, 0, command, 4)!;
    getTileAt(state.map, 6, 5)!.road = 0;
    bumpRevision(state);
    expect(sameTacticalDependencies(before, tacticalDependencies(state, 0, command, 4)!, id => id)).toBe(false);
  });
});
