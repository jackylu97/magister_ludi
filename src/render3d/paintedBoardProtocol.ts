import type { TerrainPacket } from '../terrainStudy/terrainPacket';
export type { TerrainPacket } from '../terrainStudy/terrainPacket';
import type { GameMap } from '../sim/map';
import type { GroundPaintPlan } from './groundPaint.js';
import type { PaintedBuildPart, PaintedBuildReport } from './paintedBoardAsync.js';
import type { PaintedBatchPacket, PaintedKitPacket } from './paintedBoardTransfer';

export interface BoardBuildRequest {
  map: GameMap;
  kit: PaintedKitPacket;
  shadows: boolean;
  riverStyle: { crest: number; toe: number; corner: number; organic: boolean; clearance: number } | null;
  coastStyle: boolean;
  ground: GroundPaintPlan | null;
  part?: PaintedBuildPart;
  terrainPort?: MessagePort;
  shareTo?: MessagePort[];
  shareFrom?: MessagePort;
}

export interface BoardComplete {
  type: 'complete';
  batches: PaintedBatchPacket[];
  terrain: TerrainPacket | null;
  buildMs: number;
}

export type BoardBuildReply =
  | { type: 'progress'; percent: number; stage: PaintedBuildReport; done?: number; total?: number }
  | { type: 'terrain'; terrain: TerrainPacket }
  | { type: 'error'; message: string }
  | BoardComplete;
