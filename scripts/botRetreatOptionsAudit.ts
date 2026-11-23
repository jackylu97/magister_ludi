/** Compare legal retreat endpoints against attacks by enemies visible in an original planning snapshot. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { applyCommand } from '../src/sim/commands';
import { previewCombat } from '../src/sim/combat';
import { restoreState, snapshotState } from '../src/sim/game';
import { getTileAt } from '../src/sim/map';
import { reachableTiles } from '../src/sim/pathfind';
import { bumpRevision } from '../src/sim/state';
import { isCombatant, unitDef } from '../src/sim/unitData';
import { fullMovement } from '../src/sim/units';
import { isVisibleTo } from '../src/sim/visibility';
import { atWar } from '../src/sim/wars';

const [position, unitText, output] = process.argv.slice(2);
const unitId = Number(unitText);
if (!position || !output || !Number.isSafeInteger(unitId) || unitId < 1) {
  throw Error('Pass an original planning snapshot, unit id and output path.');
}
const state = restoreState(readFileSync(position, 'utf8'));
const before = snapshotState(state);
const unit = state.units.find(u => u.id === unitId)!;
assert(unit);
const visible = state.units.filter(u => u.ownerId !== unit.ownerId &&
  atWar(state, unit.ownerId, u.ownerId) && isCombatant(unitDef(u.type)) &&
  isVisibleTo(state, unit.ownerId, u.col, u.row)).map(u => u.id);
const commands = [
  { type: 'fortify', playerId: unit.ownerId, unitId } as const,
  ...reachableTiles(state, unit).filter(r => !r.swap).map(r => ({
    type: 'moveUnit' as const, playerId: unit.ownerId, unitId,
    target: { col: r.tile.col, row: r.tile.row },
  })),
];
const rows = [];
for (const command of commands) {
  const copy = restoreState(before);
  const result = applyCommand(copy, command);
  if (!result.ok) continue;
  const defender = copy.units.find(u => u.id === unitId)!;
  const tile = getTileAt(copy.map, defender.col, defender.row)!;
  const enemies = visible.map(id => copy.units.find(u => u.id === id)).filter(u => u !== undefined);
  for (const enemy of enemies) {
    enemy.movesLeft = fullMovement(enemy, copy);
    delete enemy.hasAttacked;
  }
  bumpRevision(copy);
  const threats = [];
  for (const enemy of enemies) {
    const home = getTileAt(copy.map, enemy.col, enemy.row)!;
    const origins = [{ tile: home, cost: 0 }, ...reachableTiles(copy, enemy).filter(r => !r.swap && r.cost < enemy.movesLeft)];
    let best = null;
    for (const from of origins) {
      const preview = previewCombat(copy, enemy.id, defender, { from: from.tile });
      if (!preview.ok || preview.defenderUnitId !== unitId) continue;
      if (best === null || preview.damageToDefenderMax > best.max) best = {
        enemy: enemy.id, ownerId: enemy.ownerId, type: enemy.type,
        from: { col: from.tile.col, row: from.tile.row }, cost: from.cost,
        min: preview.damageToDefenderMin, midpoint: preview.damageToDefender, max: preview.damageToDefenderMax,
      };
    }
    if (best !== null) threats.push(best);
  }
  rows.push({ command, end: { col: defender.col, row: defender.row, hp: defender.hp, terrain: tile.terrain, feature: tile.feature, hills: tile.hills }, threats });
}
assert.equal(snapshotState(state), before);
writeFileSync(output, JSON.stringify({
  unit, visibleEnemyIds: visible,
  scope: 'Original private planning board. Independently possible attacks by originally visible enemies with a full movement allowance. This does not predict their choices or combine contested firing positions. Swap destinations are excluded.',
  rows,
}, null, 2) + '\n');
console.log(JSON.stringify({ unitId, movesLeft: unit.movesLeft, options: rows.length, noVisibleAttack: rows.filter(r => r.threats.length === 0).map(r => r.command) }));
