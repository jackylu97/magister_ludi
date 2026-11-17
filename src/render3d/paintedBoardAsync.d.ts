import type {GameMap} from '../sim/map';
import type {PaintedBoard, PaintedBoardMaterials, PaintedBuildStage, PaintedVegetationAssets} from './paintedBoard.js';
/** A step the build reports: one of the board's own, or the worker's packing of the result for the page. */
export type PaintedBuildReport = PaintedBuildStage | 'packing';
export interface PaintedBuildMetrics {
  mode: 'worker' | 'synchronous';
  totalMs: number;
  workerMs: number;
  hydrateMs: number;
  frameCount: number;
  maxFrameGapMs: number;
  /** How long each step took, as the page saw the reports arrive. Empty for a synchronous build. */
  stageMs?: Partial<Record<PaintedBuildReport, number>>;
  /** The longest wait between two reports from the worker, in milliseconds. */
  longestSilenceMs?: number;
}
export function buildPaintedBoardAsync(map: GameMap, assets: PaintedVegetationAssets, materials: PaintedBoardMaterials, shadows: boolean,
  options?: {signal?: AbortSignal; onProgress?: (percent: number, stage: PaintedBuildReport) => void; workerFactory?: () => Worker}): Promise<{board: PaintedBoard; metrics: PaintedBuildMetrics}>;
