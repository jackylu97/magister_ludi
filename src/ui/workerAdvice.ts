/**
 * Worker advice: the best two or three hexes for a selected worker to improve.
 *
 * The user's ruling of 2026-11-21: the recommended hexes wear corner ticks,
 * and the advice panel says "Advice: build a camp here" with the yields.
 *
 * This is a thin wrapper over what the bots already compute, so that the
 * advice and the bots agree. `buildImprovementPlan` (`src/ai/plan.ts`) prices
 * every legal pairing of an owned hex and an improvement, and `rankPlanFor`
 * orders them for one worker: by value, counted in full only where a citizen
 * would work the hex, and discounted for the walk. This function asks both,
 * keeps the first few hexes, and adds the change in each hex's yields from the
 * simulation's own `improvementYieldDelta`, through the owning town's context.
 *
 * It changes nothing: the plan reads the state and writes only its own memo.
 * It skips a repair and a survey, which are different commands, and it names
 * each hex once.
 *
 * It is in `src/ui/` and not in `src/ai/` because it is the interface's
 * question. It loads the bots' planner, which is large, so the controls import
 * this module only when a worker is first selected.
 */

import { valueContext } from '../ai/bot';
import { buildImprovementPlan, rankPlanFor } from '../ai/plan';
import { tileOwnerCityId } from '../sim/cities';
import { type ImprovementId, improvementDef } from '../sim/improvementData';
import { aRow, buildsImprovements, improvementYieldDelta } from '../sim/improvements';
import { VIEW3D } from '../render3d/lookData';
import { getTileAt } from '../sim/map';
import { type GameState, playerById } from '../sim/state';
import type { TileYield } from '../sim/terrainData';
import { cityContext, yieldContextFor } from '../sim/yields/hex';

/** One recommended job: the hex, the improvement, and what the hex would pay more or less with it. */
export interface WorkerAdvice {
  col: number;
  row: number;
  improvement: ImprovementId;
  /** The improvement as the noun of a sentence: "a camp", "fishing boats". */
  phrase: string;
  /** The change in the hex's yields, voice by voice. A loss is negative. */
  change: TileYield;
  /** Hexes from the worker. */
  distance: number;
  /** The bots' own score for this job and this worker. */
  score: number;
}

/** How the list is cut. The defaults are in `data/view3d.json` (`lens.advice`). */
export interface WorkerAdviceLimits {
  /** The most hexes to name. */
  count: number;
  /** The farthest hex to name, in hexes from the worker. */
  walk: number;
  /** A hex after the first is named only if its score is at least this share of the best. */
  near: number;
}

/** The best jobs for this worker, best first. Empty for a piece that builds nothing. */
export function workerAdvice(
  state: GameState,
  playerId: number,
  unitId: number,
  limits: WorkerAdviceLimits = {
    count: VIEW3D.lens.advice.workerCount, walk: VIEW3D.lens.advice.workerWalk, near: VIEW3D.lens.advice.workerNear,
  },
): WorkerAdvice[] {
  const player = playerById(state, playerId);
  const unit = state.units.find((piece) => piece.id === unitId);
  if (!player || !unit || unit.ownerId !== playerId || !buildsImprovements(unit)) return [];
  const ctx = valueContext(state, player);
  const ranked = rankPlanFor(buildImprovementPlan(state, player, ctx), state, unit, ctx);
  const out: WorkerAdvice[] = [];
  const seen = new Set<string>();
  for (const row of ranked) {
    if (out.length >= limits.count) break;
    const { entry } = row;
    if (entry.improvement === null || entry.repair) continue;
    if (row.distance > limits.walk) continue;
    if (out.length > 0 && row.score < out[0]!.score * limits.near) break;
    const key = `${entry.col},${entry.row}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const tile = getTileAt(state.map, entry.col, entry.row);
    if (!tile) continue;
    const cityId = tileOwnerCityId(state, entry.col, entry.row);
    const city = cityId === null ? undefined : state.cities.find((town) => town.id === cityId);
    const yieldCtx = city ? cityContext(state, city) : yieldContextFor(state, playerId);
    out.push({
      col: entry.col,
      row: entry.row,
      improvement: entry.improvement,
      phrase: aRow(improvementDef(entry.improvement)),
      change: improvementYieldDelta(tile, entry.improvement, yieldCtx),
      distance: row.distance,
      score: row.score,
    });
  }
  return out;
}
