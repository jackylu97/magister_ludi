import { improvementDef, type ImprovementId } from '../sim/improvementData';
import { improvementGroundError, improvementOpenTo } from '../sim/improvements';
import { tileIndex, tileNeighbors } from '../sim/map';
import { type GameState, tileOwnerField } from '../sim/state';
import { groundFactsFor, tileConditionHolds } from '../sim/statecraft/evaluator';
import type { ActionPreviewCell } from './actionPreview';

/** The build gate and the neighbouring-yield rule also price the completed work. */
export function improvementSites(state: GameState, ownerId: number, id: ImprovementId): ActionPreviewCell[] {
  const def = improvementDef(id);
  if (!def.showBuildSites || !def.perNeighbour || !improvementOpenTo(state, ownerId, id)) return [];
  const ground = groundFactsFor(state, ownerId);
  const sites: ActionPreviewCell[] = [];
  const owners = tileOwnerField(state);
  const towns = new Map(state.cities.map(city => [tileIndex(state.map, city.col, city.row), city]));
  const townsWithWork = new Set<number>();
  for (const [index, tile] of state.map.tiles.entries()) {
    const townId = state.tileOwner[index];
    if (tile.improvement === id && townId != null) townsWithWork.add(townId);
  }
  for (const [index, tile] of state.map.tiles.entries()) {
    const owner = owners.at(index);
    if (owner !== ownerId && !def.tended && def.beyondBorders === undefined) continue;
    const standing = { owner, town: towns.get(index), townsWithWork };
    if (improvementGroundError(state, ownerId, tile, id, standing) !== null) continue;
    const counts = new Map<string, number>();
    for (const near of tileNeighbors(state.map, tile)) {
      if (!tileConditionHolds(near, def.perNeighbour.on, undefined, undefined, state.turn, ground)) continue;
      const feature = def.perNeighbour.on.test === 'anyImprovement' && near.improvement
        ? improvementDef(near.improvement).name : near.terrain;
      counts.set(feature, (counts.get(feature) ?? 0) + 1);
    }
    const detail = [...counts].map(([name, count]) => `${count} × ${name}`).join(', ');
    const count = [...counts.values()].reduce((sum, n) => sum + n, 0);
    sites.push({ col: tile.col, row: tile.row, count, detail: detail || 'No neighbouring bonus' });
  }
  return sites;
}
