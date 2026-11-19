import type {GameMap} from '../sim/map';
import type {PaintedBoard, PaintedBoardMaterials, PaintedBuildStage, PaintedVegetationAssets} from './paintedBoard.js';
import type {GroundPaintPlan} from './groundPaint.js';
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
  /** How many workers built parts of the board at once (`paintedBuildParts`). */
  parts?: number;
}
/** A part of a split build: the far view's regions it builds, and whether it sends the prepared terrain. */
export interface PaintedBuildPart { regions: string[]; terrain: boolean }
export function paintedBuildParts(map: GameMap, count: number): (PaintedBuildPart | null)[];
export function paintedBuildWorkers(): number;
export function buildPaintedBoardAsync(map: GameMap, assets: PaintedVegetationAssets, materials: PaintedBoardMaterials, shadows: boolean,
  options?: {signal?: AbortSignal; onProgress?: (percent: number, stage: PaintedBuildReport) => void;
    /** Called with the prepared terrain as soon as the land step starts, on the map the board will be built on. */
    onTerrain?: ((renderMap: GameMap) => void) | null;
    /**
     * A port that the part which sends the prepared terrain also posts it to, as `{terrain}`, from its own worker.
     * The sea's bake reads it there, so the page never copies the terrain itself. The port is transferred.
     */
    terrainPort?: MessagePort | null;
    workerFactory?: () => Worker; workers?: number;
    /** The page's plan for the ground paint texture (`groundPaintPlan`), or null for the present far land. */
    ground?: GroundPaintPlan | null}): Promise<{board: PaintedBoard; metrics: PaintedBuildMetrics}>;
