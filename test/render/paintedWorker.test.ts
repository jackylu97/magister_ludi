import {afterEach, describe, expect, it, vi} from 'vitest';
// @ts-expect-error Node is provided by the test runner, outside the browser TS target.
import {createHash} from 'node:crypto';
import {BoxGeometry, Mesh, MeshStandardMaterial} from 'three';
import {createMap} from '../../src/sim/map';
// @ts-expect-error Shared study surface helpers are JavaScript.
import {packTerrainMap, restoreTerrainMap, hillMounds, surfaceHeight, neighbour} from '../../src/terrainStudy/surface.js';
import {buildPaintedBoard, type PaintedBoard, type PaintedBoardMaterials, type PaintedVegetationAssets} from '../../src/render3d/paintedBoard.js';
import {buildPaintedBoardAsync} from '../../src/render3d/paintedBoardAsync.js';
import {packPaintedKit, unpackPaintedKit, packPaintedBatches, unpackPaintedBatches, paintedTransferBuffers} from '../../src/render3d/paintedBoardTransfer.js';

const owned: {dispose(): void}[] = [];
afterEach(() => { owned.splice(0).forEach(item => item.dispose()); vi.restoreAllMocks(); vi.useRealTimers(); });
function fixture() {
  const map = createMap({width: 20, height: 3, terrain: 'grassland'});
  map.tiles.forEach((tile, i) => {
    if (i % 7 === 0) tile.terrain = 'mountain';
    else if (i % 7 === 1) tile.feature = 'forest';
    else if (i % 7 === 2) tile.hills = true;
    else if (i % 7 === 3) tile.terrain = 'lake';
    else if (i % 7 === 4) { tile.terrain = 'desert'; tile.feature = 'oasis'; }
  });
  const mat = (color = '#799741') => { const m = new MeshStandardMaterial({color, vertexColors: true}); owned.push(m); return m; };
  const materials: PaintedBoardMaterials = {
    ground: Object.fromEntries(['grassland','plains','desert','tundra','snow','mountain','ocean','coast','lake','oasis','floodplain'].map(k => [k, mat()])),
    earth: mat(), mergedLand: mat('#ffffff'), mergedWater: mat('#ffffff'), mergedDetails: mat('#ffffff'),
    water: {river: mat(), bank: mat(), shallows: mat(), foam: mat()},
    features: {shrub: mat(), stone: mat(), fertile: mat(), bank: mat(), pool: mat(), shallow: mat(), reeds: mat()},
  };
  const geometry = new BoxGeometry(.3,.8,.3); owned.push(geometry);
  const asset = {geometry, shoulderGeometry: geometry, material: mat()};
  const assets: PaintedVegetationAssets = {broadleaves: [asset,asset,asset], cypresses: [asset,asset], escarpments: [asset,asset,asset], limestone: asset, broadleaf: asset, rangeMaterial: mat()};
  return {map, assets, materials};
}
function fingerprint(board: PaintedBoard): string {
  const hash = createHash('sha256');
  for (const batch of board.exportBatches()) {
    hash.update(JSON.stringify([batch.detail,batch.surface,batch.mountainPick,batch.castShadow,batch.count]));
    for (const [name, a] of [...Object.entries(batch.geometry.attributes), ['index',batch.geometry.index], ['matrix',batch.matrix], ['color',batch.color]] as const) {
      if (!a) continue;
      hash.update(`${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`);
      hash.update(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));
    }
  }
  return hash.digest('hex');
}
function fakeWorker() {
  return {onmessage: null, onerror: null, onmessageerror: null, postMessage: vi.fn(), terminate: vi.fn()} as unknown as Worker;
}

describe('painted worker transfer', () => {
  it('retains exact terrain, prop transforms, live material hooks, fog, LOD and wrapped picking', () => {
    const {map, assets, materials} = fixture();
    const original = JSON.stringify(map), livePosition = assets.broadleaf.geometry.attributes.position;
    materials.mergedLand.onBeforeCompile = vi.fn();
    const reference = buildPaintedBoard(map,assets,materials); owned.push(reference);
    const kit = packPaintedKit(assets,materials), remote = unpackPaintedKit(structuredClone(kit.packet));
    owned.push(...remote.bindings);
    const built = buildPaintedBoard(structuredClone(map),remote.assets,remote.materials); owned.push(built);
    expect(fingerprint(built)).toBe(fingerprint(reference));
    const packets = packPaintedBatches(built.exportBatches(),remote.bindings), transfers = paintedTransferBuffers(packets);
    expect(new Set(transfers).size).toBe(transfers.length);
    expect(transfers).not.toContain(remote.assets.broadleaf.geometry.attributes.position.array.buffer);
    const received = structuredClone(packets,{transfer: transfers});
    expect(transfers.every(buffer => buffer.byteLength === 0)).toBe(true);
    expect(livePosition.array.byteLength).toBeGreaterThan(0);
    const terrain = restoreTerrainMap(structuredClone(packTerrainMap(built.renderMap)));
    const hydrated = buildPaintedBoard(map,assets,materials,true,unpackPaintedBatches(received,kit.bindings),undefined,terrain); owned.push(hydrated);
    expect(fingerprint(hydrated)).toBe(fingerprint(reference));
    for (let i=0;i<map.tiles.length;i++) {
      expect(hillMounds(hydrated.renderMap.tiles[i])).toEqual(hillMounds(reference.renderMap.tiles[i]));
      expect(surfaceHeight(hydrated.renderMap.tiles[i],.1,.2)).toBe(surfaceHeight(reference.renderMap.tiles[i],.1,.2));
    }
    expect(neighbour(hydrated.renderMap.tiles[0],hydrated.renderMap,3).col).toBe(map.width-1);
    expect(hydrated.geometryBytes).toBe(reference.geometryBytes);
    expect(hydrated.instanceBytes).toBe(reference.instanceBytes);
    expect(hydrated.pickMeshes.length).toBe(reference.pickMeshes.length);
    expect(hydrated.exportBatches().find(batch => batch.source === materials.mergedLand)).toBeDefined();
    const props = hydrated.exportBatches().filter(batch => batch.base);
    expect(props.length).toBeGreaterThan(0);
    expect(props.every(batch => batch.geometry.attributes.position === livePosition)).toBe(true);
    for (const board of [reference,hydrated]) {
      board.applyFog(map.tiles.map((_,i) => i % 3));
      board.suppressTile(1,2); board.reserveFootprints(new Map([[2,.4]]));
      board.updateDetail(10);
    }
    expect(Array.from(hydrated.fogTexture.image.data!)).toEqual(Array.from(reference.fogTexture.image.data!));
    expect(hydrated.drawCalls).toBe(reference.drawCalls);
    expect(hydrated.triangleCount).toBe(reference.triangleCount);
    for (const board of [reference,hydrated]) board.updateDetail(10,true);
    expect(hydrated.drawCalls).toBe(reference.drawCalls);
    expect(hydrated.triangleCount).toBe(reference.triangleCount);
    const peaks = hydrated.pickMeshes.filter(mesh => mesh.userData.paintedPickOnly);
    expect(peaks.length).toBeGreaterThan(0);
    expect(peaks.every(mesh => typeof mesh.userData.paintedCellVisible === 'function')).toBe(true);
    hydrated.group.traverse(object => { if (object instanceof Mesh) expect(object.customDepthMaterial).toBeDefined(); });
    expect(JSON.stringify(map)).toBe(original);
    hydrated.dispose();
    expect(assets.broadleaf.geometry.attributes.position).toBe(livePosition);
  });

  it('aborts pending CPU work and ignores late output', async () => {
    const {map,assets,materials} = fixture(), worker = fakeWorker(), controller = new AbortController();
    const pending = buildPaintedBoardAsync(map,assets,materials,true,{signal:controller.signal,workerFactory:() => worker});
    const rejected = expect(pending).rejects.toMatchObject({name:'AbortError'});
    controller.abort(); await rejected;
    expect(worker.terminate).toHaveBeenCalledOnce(); expect(worker.onmessage).toBeNull();
  });

  it('does not launch already-cancelled builds', async () => {
    const {map,assets,materials} = fixture(), controller = new AbortController(), factory = vi.fn(); controller.abort();
    await expect(buildPaintedBoardAsync(map,assets,materials,true,{signal:controller.signal,workerFactory:factory})).rejects.toMatchObject({name:'AbortError'});
    expect(factory).not.toHaveBeenCalled();
  });

  it.each(['error','messageerror','build','post','timeout'])('releases workers on %s failure instead of silently blocking on fallback', async mode => {
    vi.useFakeTimers();
    const {map,assets,materials} = fixture(), worker = fakeWorker();
    if (mode === 'post') vi.mocked(worker.postMessage).mockImplementation(() => { throw new Error('post failed'); });
    const pending = buildPaintedBoardAsync(map,assets,materials,true,{workerFactory:() => worker});
    const rejected = expect(pending).rejects.toBeInstanceOf(Error);
    if (mode === 'error') worker.onerror?.call(worker,{message:'worker failed',preventDefault(){}} as ErrorEvent);
    if (mode === 'messageerror') worker.onmessageerror?.call(worker,{} as MessageEvent);
    if (mode === 'build') worker.onmessage?.call(worker,{data:{type:'error',message:'build failed'}} as MessageEvent);
    if (mode === 'timeout') await vi.advanceTimersByTimeAsync(120_000);
    await rejected; expect(worker.terminate).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
});
