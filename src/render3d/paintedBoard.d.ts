import type { BufferGeometry, DataTexture, InstancedBufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import type { GameMap } from '../sim/map';
import type { BuiltBoard } from './board3d';

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
  detail: 'near' | 'far' | 'always';
  surface: boolean;
  mountainPick: boolean;
  /** What the batch casts when shadows are on, never the live flag. */
  castShadow: boolean;
  cells?: number[];
}
export interface PaintedBoard extends BuiltBoard {
  replaceHillRelief(cells: ReadonlySet<number>): boolean;
  exportBatches(): PaintedBoardBatch[];
  renderMap: GameMap;
  pickMeshes: Mesh[];
  fogTexture: DataTexture;
  /** The register's live knobs, so a review page can move one without a rebuild. */
  fogUniforms: Record<string, { value: unknown }>;
  readonly shadowRevision: number;
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
export function buildPaintedBoard(map: GameMap, assets: PaintedVegetationAssets, materials: PaintedBoardMaterials, shadows?: boolean, prepared?: PaintedBoardBatch[] | null, progress?: (done: number, total: number) => void, preparedMap?: GameMap | null): PaintedBoard;
