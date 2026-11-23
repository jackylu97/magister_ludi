import { attackRange, pieceStrength } from '../../sim/combat';
import type { Command } from '../../sim/commands';
import { mapRange, getTileAt, tileHex, tileIndex } from '../../sim/map';
import { moveProfile } from '../../sim/pathfind';
import { effectsOfKind, liveEffects } from '../../sim/statecraft/evaluator';
import { isCombatant, unitDef } from '../../sim/unitData';
import type { GameState } from '../../sim/state';
import { isVisibleTo } from '../../sim/visibility';
import { distance } from './position';

export interface TacticalDependencies {
  fullEnemyAllowance?: boolean;
  centres: { col: number; row: number }[];
  radius: number;
  units: { id: number; facts: string }[];
  cities: { id: number; facts: string }[];
  ground: string;
  empires: string;
}

/**
 * Preserve local occupancy and movement inputs at the worker boundary. Include
 * the treasury when a combat line uses it, such as War Bonds.
 * Empire effects and city facts remain because combat conditions can read them.
 */
export function tacticalDependencies(
  state: GameState, playerId: number, command: Command, radius: number,
  centres?: TacticalDependencies['centres'],
  fullEnemyAllowance = false,
): TacticalDependencies | null {
  if (!('unitId' in command) || !['attack', 'moveUnit', 'fortify'].includes(command.type)) return null;
  const actor = state.units.find(unit => unit.id === command.unitId);
  if (!actor || !isCombatant(unitDef(actor.type))) return null;
  const at = centres ?? [{ col: actor.col, row: actor.row }, ...('target' in command ? [command.target] : [])];
  const near = (cell: { col: number; row: number }): boolean => at.some(centre => distance(state, centre, cell) <= radius);
  const units = state.units.filter(unit => near(unit) && (unit.ownerId === playerId || isVisibleTo(state, playerId, unit.col, unit.row)));
  const owners = [...new Set(units.map(unit => unit.ownerId))].sort((a, b) => a - b);
  const indices: number[] = [];
  for (const centre of at) {
    const tile = getTileAt(state.map, centre.col, centre.row);
    if (!tile) continue;
    for (const cell of mapRange(state.map, tileHex(tile), radius)) indices.push(tileIndex(state.map, cell.col, cell.row));
  }
  const ground = [...new Set(indices)].sort((a, b) => a - b).map(index => [index, state.map.tiles[index], state.tileOwner[index], state.visibility[playerId]?.[index]]);
  return {
    ...(fullEnemyAllowance ? { fullEnemyAllowance: true } : {}),
    centres: at, radius,
    units: units.map(unit => {
      const { id, path: _path, ...facts } = unit;
      // The per-unit policy forecasts the next enemy opportunity. Spent enemy
      // movement and attack allowances do not change that assessment.
      if (fullEnemyAllowance && unit.ownerId !== playerId) {
        facts.movesLeft = 0;
        facts.hasAttacked = false;
        delete facts.firstAttackTurn;
      }
      const { ports: _ports, def: _def, ...profile } = moveProfile(state, unit);
      return { id, facts: JSON.stringify([facts, profile, attackRange(state, unit), pieceStrength(unit)]) };
    }),
    cities: state.cities.filter(city => near(city)).map(city => {
      return { id: city.id, facts: JSON.stringify([city.col, city.row, city.ownerId, city.hp, city.population, city.buildings, city.timed]) };
    }),
    ground: JSON.stringify(ground),
    empires: JSON.stringify([state.wars, state.religions, state.deals,
      state.players.map(player => player.techsResearched), owners.map(owner => [owner, liveEffects(state, owner),
      state.cities.filter(city => city.ownerId === owner).map(city => [city.col, city.row, city.population, city.buildings]),
      state.players[owner]?.strikesThisTurn,
      effectsOfKind(state, owner, 'combatLine').some(({ effect }) => effect.scaled?.count === 'bankedGold')
        ? state.players[owner]?.gold : null,
    ])]),
  };
}

export function sameTacticalDependencies(expected: TacticalDependencies, actual: TacticalDependencies, mapId: (id: number) => number | null): boolean {
  const mapped = (rows: TacticalDependencies['units']): string => JSON.stringify(rows.map(row => ({ ...row, id: mapId(row.id) })).sort((a, b) => (a.id ?? -1) - (b.id ?? -1)));
  const stable = (rows: TacticalDependencies['units']): string => JSON.stringify([...rows].sort((a, b) => a.id - b.id));
  return expected.ground === actual.ground && expected.empires === actual.empires &&
    mapped(expected.units) === stable(actual.units) && mapped(expected.cities) === stable(actual.cities);
}
