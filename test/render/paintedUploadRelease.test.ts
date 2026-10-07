/**
 * The board's surface batches drop their vertex colours and turf weights once
 * the GPU has them (WebGL audit 2026-10-06, finding 12). Safe only because a
 * lost context rebuilds the board instead of re-uploading it
 * (`Renderer3D.recoverContext`), and only for arrays nothing reads after the
 * upload. These tests stand in for the upload by calling each attribute's
 * `onUploadCallback`, which is exactly what three does after `bufferData`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { BoxGeometry, type BufferAttribute, type BufferGeometry, InstancedMesh, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import {
  RELEASED_AFTER_UPLOAD, buildPaintedBoard, type PaintedBoard, type PaintedBoardMaterials, type PaintedVegetationAssets,
} from '../../src/render3d/paintedBoard.js';
import { packPaintedKit, unpackPaintedKit, packPaintedBatches, unpackPaintedBatches, paintedTransferBuffers } from '../../src/render3d/paintedBoardTransfer.js';
// @ts-expect-error Shared study surface helpers are JavaScript.
import { packTerrainMap, restoreTerrainMap } from '../../src/terrainStudy/surface.js';
import { createMap } from '../../src/sim/map';

const owned: { dispose(): void }[] = [];
afterEach(() => { owned.splice(0).forEach(item => item.dispose()); });

function fixture() {
  const map = createMap({ width: 12, height: 4, terrain: 'grassland' });
  map.tiles.forEach((tile, i) => {
    if (i % 5 === 0) tile.feature = 'forest';
    else if (i % 5 === 1) tile.hills = true;
    else if (i % 5 === 2) tile.terrain = 'lake';
    else if (i % 5 === 3) tile.terrain = 'plains';
  });
  const mat = (color = '#799741'): MeshStandardMaterial => { const m = new MeshStandardMaterial({ color, vertexColors: true }); owned.push(m); return m; };
  const materials: PaintedBoardMaterials = {
    ground: Object.fromEntries(['grassland', 'plains', 'desert', 'tundra', 'snow', 'mountain', 'ocean', 'coast', 'lake', 'oasis', 'floodplain'].map(k => [k, mat()])),
    earth: mat(), mergedLand: mat('#ffffff'), mergedWater: mat('#ffffff'), mergedDetails: mat('#ffffff'),
    water: { river: mat(), bank: mat(), shallows: mat(), foam: mat() },
    features: { shrub: mat(), stone: mat(), fertile: mat(), bank: mat(), pool: mat(), shallow: mat(), reeds: mat() },
  };
  const geometry = new BoxGeometry(0.3, 0.8, 0.3); owned.push(geometry);
  const asset = { geometry, shoulderGeometry: geometry, material: mat() };
  const assets: PaintedVegetationAssets = { broadleaves: [asset, asset, asset], cypresses: [asset, asset], escarpments: [asset, asset, asset], limestone: asset, broadleaf: asset, rangeMaterial: mat() };
  return { map, assets, materials, sculpt: geometry };
}

function meshes(board: PaintedBoard): Mesh[] {
  const out: Mesh[] = [];
  board.group.traverse(object => { if (object instanceof Mesh) out.push(object); });
  return out;
}

/** What three does after it hands an attribute to the GPU. */
function upload(board: PaintedBoard): void {
  for (const mesh of meshes(board)) {
    const geometry = mesh.geometry as BufferGeometry;
    for (const attribute of Object.values(geometry.attributes)) (attribute as BufferAttribute).onUploadCallback();
    geometry.index?.onUploadCallback();
  }
}

function surfaceAttributes(board: PaintedBoard, name: string): BufferAttribute[] {
  const found = new Set<BufferAttribute>();
  for (const mesh of meshes(board)) {
    if (mesh instanceof InstancedMesh) continue;
    const attribute = mesh.geometry.getAttribute(name) as BufferAttribute | undefined;
    if (attribute) found.add(attribute);
  }
  return [...found];
}

describe('the board drops what nothing reads after upload', () => {
  it('names exactly the vertex colours and the turf weights', () => {
    expect([...RELEASED_AFTER_UPLOAD]).toEqual(['color', 'turfWeight']);
  });

  it('keeps every array until the upload, so the worker can still export the batches', () => {
    const { map, assets, materials } = fixture();
    const board = buildPaintedBoard(map, assets, materials); owned.push(board);
    expect(surfaceAttributes(board, 'color').length).toBeGreaterThan(0);
    for (const attribute of surfaceAttributes(board, 'color')) expect(attribute.array).not.toBeNull();
    expect(() => board.exportBatches().map(batch => batch.geometry.getAttribute('position').array.byteLength)).not.toThrow();
  });

  it('releases colours and turf weights on the surfaces, and nothing else', () => {
    const { map, assets, materials, sculpt } = fixture();
    const board = buildPaintedBoard(map, assets, materials); owned.push(board);
    const colours = surfaceAttributes(board, 'color'), turf = surfaceAttributes(board, 'turfWeight');
    expect(colours.length).toBeGreaterThan(0);
    expect(turf.length).toBeGreaterThan(0);
    upload(board);
    for (const attribute of [...colours, ...turf]) {
      expect(attribute.array).toBeNull();
      // three keeps the count, which is all a later draw reads.
      expect(attribute.count).toBeGreaterThan(0);
    }
    // Positions, the index, and the fog, relief and clearing attributes stay.
    for (const name of ['position', 'normal', 'paintedCell', 'paintedSuppress', 'paintedRelief']) {
      for (const attribute of surfaceAttributes(board, name)) expect(attribute.array, name).not.toBeNull();
    }
    for (const mesh of meshes(board)) if (mesh.geometry.index) expect(mesh.geometry.index.array).not.toBeNull();
    // The props share the asset's sculpt, which other boards still build from.
    expect(sculpt.getAttribute('position').array).not.toBeNull();
    expect(sculpt.getAttribute('normal').array).not.toBeNull();
  });

  it('still fogs, clears, re-cuts hill relief and picks after the release', () => {
    const { map, assets, materials } = fixture();
    const board = buildPaintedBoard(map, assets, materials); owned.push(board);
    upload(board);
    expect(board.applyFog(new Array(map.tiles.length).fill(2))).toBe(map.tiles.length);
    expect(board.suppressTile(3, 2)).toBe(true);
    expect(() => board.replaceHillRelief(new Set([1, 6]))).not.toThrow();
    const ray = new Raycaster(new Vector3(1, 5, 1), new Vector3(0, -1, 0));
    board.group.updateMatrixWorld(true);
    expect(ray.intersectObjects(board.pickMeshes, false).length).toBeGreaterThan(0);
  });

  it('releases the same attributes on a board hydrated from the worker', () => {
    const { map, assets, materials } = fixture();
    const kit = packPaintedKit(assets, materials), remote = unpackPaintedKit(structuredClone(kit.packet));
    owned.push(...(remote.bindings as { dispose(): void }[]));
    const built = buildPaintedBoard(structuredClone(map), remote.assets, remote.materials); owned.push(built);
    const packets = packPaintedBatches(built.exportBatches(), remote.bindings), transfers = paintedTransferBuffers(packets);
    const received = structuredClone(packets, { transfer: transfers });
    const terrain = restoreTerrainMap(structuredClone(packTerrainMap(built.renderMap)));
    const hydrated = buildPaintedBoard(map, assets, materials, true, unpackPaintedBatches(received, kit.bindings), undefined, terrain);
    owned.push(hydrated);
    const colours = surfaceAttributes(hydrated, 'color');
    expect(colours.length).toBeGreaterThan(0);
    upload(hydrated);
    for (const attribute of colours) expect(attribute.array).toBeNull();
    for (const attribute of surfaceAttributes(hydrated, 'position')) expect(attribute.array).not.toBeNull();
    for (const mesh of meshes(hydrated)) {
      if (!(mesh instanceof InstancedMesh)) continue;
      for (const attribute of Object.values(mesh.geometry.attributes)) expect((attribute as BufferAttribute).array).not.toBeNull();
    }
  });
});

