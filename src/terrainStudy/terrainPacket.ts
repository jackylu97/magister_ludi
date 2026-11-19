import type { GameMap } from '../sim/map';

export interface HillMound {
  faces: number[][][];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  pigmentKind?: string;
  strokeId?: number;
  shared?: boolean;
}

export type MoundsByTile = (HillMound[] | null)[];

export interface TerrainPacket {
  map: GameMap;
  wrap: boolean;
  mounds: MoundsByTile | {
    present: Uint8Array;
    pieces: Uint32Array;
    faces: Uint32Array;
    corners: Float64Array;
    rest: Omit<HillMound, 'faces'>[];
  };
}
