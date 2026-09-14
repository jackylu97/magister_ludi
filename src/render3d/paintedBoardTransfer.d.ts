import type {BufferGeometry, MeshStandardMaterial} from 'three';
import type {PaintedBoardBatch, PaintedVegetationAssets, PaintedBoardMaterials} from './paintedBoard.js';
type Binding = BufferGeometry | MeshStandardMaterial;
// Opaque wire formats: only the pack/unpack pair interprets these packets.
export interface PaintedKitPacket {readonly __kitPacket: unique symbol}
export interface PaintedBatchPacket {readonly __batchPacket: unique symbol}
export function packPaintedKit(assets: PaintedVegetationAssets, materials: PaintedBoardMaterials): {packet: PaintedKitPacket; bindings: Binding[]};
export function unpackPaintedKit(packet: PaintedKitPacket): {assets: PaintedVegetationAssets; materials: PaintedBoardMaterials; bindings: Binding[]};
export function packPaintedBatches(batches: PaintedBoardBatch[], bindings: Binding[]): PaintedBatchPacket[];
export function unpackPaintedBatches(packets: PaintedBatchPacket[], bindings: Binding[]): PaintedBoardBatch[];
export function paintedTransferBuffers(packets: PaintedBatchPacket[]): ArrayBuffer[];
