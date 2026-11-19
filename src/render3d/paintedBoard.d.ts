import type { BufferGeometry, DataTexture, Group, InstancedBufferAttribute, Mesh, MeshStandardMaterial, Texture, WebGLRenderer } from 'three';
import type { GameMap } from '../sim/map';
import type { BuiltBoard } from './board3d';
import type { GroundPaintInfo, GroundPaintPlan } from './groundPaint.js';

export interface PaintedVegetationAsset {
  geometry: BufferGeometry;
  shoulderGeometry?: BufferGeometry | null;
  /** The map-scale stand-in, where the distance sheet names this family. */
  farGeometry?: BufferGeometry | null;
  farShoulderGeometry?: BufferGeometry | null;
  material: MeshStandardMaterial;
}
export interface PaintedVegetationAssets {
  broadleaves: PaintedVegetationAsset[];
  cypresses: PaintedVegetationAsset[];
  escarpments: PaintedVegetationAsset[];
  limestone: PaintedVegetationAsset;
  broadleaf: PaintedVegetationAsset;
  rangeMaterial: MeshStandardMaterial;
}
export interface PaintedBoardMaterials {
  ground: Record<string, MeshStandardMaterial>;
  earth: MeshStandardMaterial;
  mergedLand: MeshStandardMaterial;
  mergedWater: MeshStandardMaterial;
  mergedDetails: MeshStandardMaterial;
  water: Record<string, MeshStandardMaterial>;
  features: Record<string, MeshStandardMaterial>;
}
export interface PaintedBoardBatch {
  geometry: BufferGeometry;
  source: MeshStandardMaterial;
  base?: BufferGeometry | null;
  matrix?: InstancedBufferAttribute | null;
  color?: InstancedBufferAttribute | null;
  count?: number;
  /**
   * Which zoom draws the batch. `near` and `far` follow `painted.lod`. On a
   * board with a plain land, the land's batches are `cut` (the land with its
   * brush patches cut in) and `plain` (the land that reads the paint texture),
   * and those two follow the plain land's own band instead.
   */
  detail: 'near' | 'far' | 'always' | 'cut' | 'plain';
  surface: boolean;
  mountainPick: boolean;
  /** What the batch casts when shadows are on, never the live flag. */
  castShadow: boolean;
  cells?: number[];
  /** Where the batch stands in a whole build's order: [step, rank, count]. See `buildPaintedBoard`'s `part`. */
  order?: [number, number, number];
}
export interface PaintedBoard extends BuiltBoard {
  replaceHillRelief(cells: ReadonlySet<number>): boolean;
  exportBatches(): PaintedBoardBatch[];
  renderMap: GameMap;
  pickMeshes: Mesh[];
  /** The three wrap copies (x = −W, 0, +W), in that order. See `copyCulling.ts`. */
  readonly copies: readonly Group[];
  fogTexture: DataTexture;
  /** The register's live knobs, so a review page can move one without a rebuild. */
  fogUniforms: Record<string, { value: unknown }>;
  readonly shadowRevision: number;
  /**
   * The ground paint texture (`groundPaint.js`), or null when the board has no
   * plain land. The renderer calls `step` once a display frame while `pending`
   * is true; the step that finishes the bake returns true.
   */
  readonly groundPaint: null | {
    readonly plan: GroundPaintPlan;
    /** The texture is baked, so the plain land may be drawn. */
    readonly ready: boolean;
    readonly pending: boolean;
    readonly failed: boolean;
    readonly info: GroundPaintInfo | null;
    /** The plain land's zoom band, in pixels a hex. */
    readonly nearPixels: number;
    readonly farPixels: number;
    readonly texture: Texture | null;
    /** The plain land is drawn now (and the cut land is not). */
    readonly drawn: boolean;
    /** Makes the bake's targets and starts linking its program, off the page's thread where the GPU allows it. */
    prepare(renderer: WebGLRenderer): void;
    /** Uses the bake's program once: called just before the board's first frame. */
    prime(renderer: WebGLRenderer): void;
    /** With true, one charted chunk of plain land is drawn with no colour and no depth (the board's first frame); false puts it back. */
    primeLand(on: boolean): void;
    step(renderer: WebGLRenderer): boolean;
  };
  geometryBytes: number;
  instanceBytes: number;
  readonly triangleCount: number;
  applyFog(levels: ArrayLike<number> | null, at?: number): number;
  /** Walks the eased reveals. Returns how many cells are still moving. */
  advanceReveal(now: number): number;
  revealMs: number;
  readonly revealStamps: number;
  readonly revealing: number;
  /** The uncharted register's paper. Added to the board's own wrap copies. */
  createChartTable(register?: (material: MeshStandardMaterial) => unknown): Mesh;
  reserveFootprints(radii: ReadonlyMap<number,number>): number;
  isCellVisible(cell: number, grade?: number): boolean;
  updateDetail(pixels: number): boolean;
  /** Raises near geometry for the static depth pass alone. True when it moved. */
  setBakeDetail(active: boolean): boolean;
  /** Flips the world's cast flags on the built board. True when the state changed. */
  setShadows(enabled: boolean): boolean;
  suppressTile(cell: number, scope: 0 | 1 | 2): boolean;
  unsuppressTile(cell: number): boolean;
}
/**
 * The steps of a board build, in order, as `progress` names them: the hills
 * shaped, the mountain ranges, the colours, the rivers, the coast, the sea, the
 * land (the one step that counts, chunk by chunk), and the far view.
 */
export type PaintedBuildStage = 'shape' | 'mountains' | 'colours' | 'rivers' | 'coast' | 'sea' | 'land' | 'overview';
/** The far view's region of a hex (18 by 18 hexes). A part of a split build owns whole regions. */
export function paintedRegionKey(col: number, row: number): string;
/**
 * How the parts of a split build work out the map's shape and rivers once: the part that publishes hands each on as
 * it is done, and a part that receives builds on what it was handed. See `buildPaintedBoard`.
 */
export type PaintedBuildShare =
  | {publish(kind: 'shape' | 'rivers', payload: unknown): void}
  | {shape: unknown; rivers: unknown};
export function buildPaintedBoard(map: GameMap, assets: PaintedVegetationAssets, materials: PaintedBoardMaterials, shadows?: boolean, prepared?: PaintedBoardBatch[] | null, progress?: (done: number, total: number, stage: PaintedBuildStage, prepared?: GameMap) => void, preparedMap?: GameMap | null, part?: {regions: ReadonlySet<string>} | null, share?: PaintedBuildShare | null, ground?: GroundPaintPlan | null): PaintedBoard;
/** The surface attributes whose arrays are dropped after their first upload. */
export const RELEASED_AFTER_UPLOAD: readonly string[];
