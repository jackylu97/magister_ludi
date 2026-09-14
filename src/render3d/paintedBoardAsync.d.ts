import type {GameMap} from '../sim/map';
import type {PaintedBoard, PaintedBoardMaterials, PaintedVegetationAssets} from './paintedBoard.js';
export interface PaintedBuildMetrics {
  mode: 'worker' | 'synchronous';
  totalMs: number;
  workerMs: number;
  hydrateMs: number;
  frameCount: number;
  maxFrameGapMs: number;
}
export function buildPaintedBoardAsync(map: GameMap, assets: PaintedVegetationAssets, materials: PaintedBoardMaterials, shadows: boolean,
  options?: {signal?: AbortSignal; onProgress?: (percent: number) => void; workerFactory?: () => Worker}): Promise<{board: PaintedBoard; metrics: PaintedBuildMetrics}>;
