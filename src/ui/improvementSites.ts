import { improvementDef, type ImprovementId } from '../sim/improvementData';
import { improvementGroundError, improvementOpenTo } from '../sim/improvements';
import { tileNeighbors } from '../sim/map';
import type { GameState } from '../sim/state';
import { groundFactsFor, tileConditionHolds } from '../sim/statecraft/evaluator';
import type { ActionPreviewCell } from './actionPreview';

/** The build gate and the neighbouring-yield rule also price the completed work. */
export function improvementSites(state: GameState, ownerId: number, id: ImprovementId): ActionPreviewCell[] {
  const def = improvementDef(id);
  if (!def.showBuildSites || !def.perNeighbour || !improvementOpenTo(state, ownerId, id)) return [];
  const ground = groundFactsFor(state, ownerId);
  const sites: ActionPreviewCell[] = [];
  for (const tile of state.map.tiles) {
    if (improvementGroundError(state, ownerId, tile, id) !== null) continue;
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
