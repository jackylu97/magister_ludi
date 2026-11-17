import {afterEach, describe, expect, it, vi} from 'vitest';
// @ts-expect-error Node is provided by the test runner, outside the browser TS target.
import {createHash} from 'node:crypto';
import {BoxGeometry, Mesh, MeshStandardMaterial} from 'three';
import {createMap} from '../../src/sim/map';
// @ts-expect-error Shared study surface helpers are JavaScript.
import {packTerrainMap, restoreTerrainMap, hillMounds, surfaceHeight, neighbour} from '../../src/terrainStudy/surface.js';
import {buildPaintedBoard, paintedRegionKey, type PaintedBoard, type PaintedBoardMaterials, type PaintedVegetationAssets} from '../../src/render3d/paintedBoard.js';
import {buildPaintedBoardAsync, paintedBuildParts} from '../../src/render3d/paintedBoardAsync.js';
import {packPaintedKit, unpackPaintedKit, packPaintedBatches, unpackPaintedBatches, paintedTransferBuffers} from '../../src/render3d/paintedBoardTransfer.js';

const owned: {dispose(): void}[] = [];
afterEach(() => { owned.splice(0).forEach(item => item.dispose()); vi.restoreAllMocks(); vi.useRealTimers(); });
function fixture(width = 20, height = 3) {
  const map = createMap({width, height, terrain: 'grassland'});
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
    for (const board of [reference,hydrated]) board.setBakeDetail(true);
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

  it.each(['error','messageerror','build','post'])('releases workers on %s failure instead of silently blocking on fallback', async mode => {
    vi.useFakeTimers();
    const {map,assets,materials} = fixture(), worker = fakeWorker();
    if (mode === 'post') vi.mocked(worker.postMessage).mockImplementation(() => { throw new Error('post failed'); });
    const pending = buildPaintedBoardAsync(map,assets,materials,true,{workerFactory:() => worker});
    const rejected = expect(pending).rejects.toBeInstanceOf(Error);
    if (mode === 'error') worker.onerror?.call(worker,{message:'worker failed',preventDefault(){}} as ErrorEvent);
    if (mode === 'messageerror') worker.onmessageerror?.call(worker,{} as MessageEvent);
    if (mode === 'build') worker.onmessage?.call(worker,{data:{type:'error',message:'build failed'}} as MessageEvent);
    await rejected; expect(worker.terminate).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  // There was a fixed limit of 120 s, and a busy machine sent the player back
  // to the title with no game. A slow build is not a failure: only an error is.
  it('has no time limit: a build that takes many minutes still lands, and passes on every step it reports', async () => {
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance']});
    const {map,assets,materials} = fixture(), worker = fakeWorker();
    const reports: [number, string][] = [];
    const pending = buildPaintedBoardAsync(map,assets,materials,true,{workerFactory:() => worker, onProgress:(percent, stage) => reports.push([percent, stage])});
    const settled = vi.fn(); pending.then(settled, settled);
    expect(vi.getTimerCount()).toBe(0);
    // Ten silent minutes on one step, then the land step counts, slowly.
    worker.onmessage?.call(worker,{data:{type:'progress',percent:0,stage:'shape'}} as MessageEvent);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    for (const percent of [0, 50, 100]) {
      worker.onmessage?.call(worker,{data:{type:'progress',percent,stage:'land'}} as MessageEvent);
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    }
    expect(settled).not.toHaveBeenCalled();
    expect(worker.terminate).not.toHaveBeenCalled();
    expect(reports).toEqual([[0,'shape'],[0,'land'],[50,'land'],[100,'land']]);
    // The worker's real result: a board built here, packed as the worker packs it.
    const reference = buildPaintedBoard(map,assets,materials); owned.push(reference);
    const kit = packPaintedKit(assets,materials), batches = packPaintedBatches(reference.exportBatches(), kit.bindings);
    worker.onmessage?.call(worker,{data:{type:'complete',batches,terrain:packTerrainMap(reference.renderMap),buildMs:1}} as MessageEvent);
    const {board, metrics} = await pending; owned.push(board);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(metrics.longestSilenceMs).toBeGreaterThanOrEqual(10 * 60_000);
    expect(metrics.stageMs?.shape).toBeGreaterThanOrEqual(10 * 60_000);
  });

  // The land and the far view are split across several workers by the far view's regions (third render speed pass).
  // Each part's batches carry their place in one whole build's order, so the board the page puts together from the
  // parts must be the board one worker builds, batch for batch and byte for byte.
  it('shares the regions among the parts, each once, and puts the parts back into the one-worker board', {timeout: 120_000}, async () => {
    // Four regions (two by two), kept small: each part prepares the whole map, so this test builds it four times.
    const {map, assets, materials} = fixture(24, 20);
    map.tiles.forEach((tile, i) => { if (i % 11 === 5) tile.terrain = 'ocean'; });
    const parts = paintedBuildParts(map, 3);
    expect(parts).toHaveLength(3);
    const regions = new Set(map.tiles.map(tile => paintedRegionKey(tile.col, tile.row)));
    const shared = parts.flatMap(part => part!.regions);
    expect(shared.sort()).toEqual([...regions].sort());
    expect(parts.map(part => part!.terrain)).toEqual([true, false, false]);
    expect(paintedBuildParts(map, 1)).toEqual([null]);
    const workers = [fakeWorker(), fakeWorker(), fakeWorker()];
    let next = 0;
    const reports: [number, string][] = [];
    const pending = buildPaintedBoardAsync(map, assets, materials, true, {workerFactory: () => workers[next++]!, workers: 3,
      onProgress: (percent, stage) => reports.push([percent, stage])});
    expect(next).toBe(3);
    const kit = packPaintedKit(assets, materials);
    // Each fake worker builds what it was handed, as the worker does, and reports as it goes.
    for (const [index, worker] of workers.entries()) {
      const message = vi.mocked(worker.postMessage).mock.calls[0]![0] as {part: {regions: string[]; terrain: boolean}};
      expect(message.part).toEqual(parts[index]);
      worker.onmessage?.call(worker, {data: {type: 'progress', percent: 0, stage: 'land', done: 0, total: 1}} as MessageEvent);
    }
    expect(reports[reports.length - 1]).toEqual([0, 'land']);
    for (const [index, worker] of workers.entries()) {
      const {part} = vi.mocked(worker.postMessage).mock.calls[0]![0] as {part: {regions: string[]; terrain: boolean}};
      const built = buildPaintedBoard(structuredClone(map), assets, materials, true, null, undefined, null, {regions: new Set(part.regions)}); owned.push(built);
      worker.onmessage?.call(worker, {data: {type: 'progress', percent: 100, stage: 'packing'}} as MessageEvent);
      worker.onmessage?.call(worker, {data: {type: 'complete', batches: packPaintedBatches(built.exportBatches(), kit.bindings),
        terrain: part.terrain ? packTerrainMap(built.renderMap) : null, buildMs: index + 1}} as MessageEvent);
    }
    expect(reports[reports.length - 1]).toEqual([100, 'packing']);
    const {board, metrics} = await pending; owned.push(board);
    expect(metrics.parts).toBe(3);
    for (const worker of workers) expect(worker.terminate).toHaveBeenCalledOnce();
    // The one-worker board, through the same packing and hydrate.
    const whole = buildPaintedBoard(structuredClone(map), assets, materials); owned.push(whole);
    const hydrated = buildPaintedBoard(map, assets, materials, true, unpackPaintedBatches(packPaintedBatches(whole.exportBatches(), kit.bindings), kit.bindings),
      undefined, restoreTerrainMap(packTerrainMap(whole.renderMap))); owned.push(hydrated);
    expect(board.exportBatches().length).toBe(whole.exportBatches().length);
    expect(fingerprint(board)).toBe(fingerprint(hydrated));
    expect(fingerprint(board)).toBe(fingerprint(whole));
  });

  // The prepared terrain is complete when the land step starts, so the worker sends it then, and the page bakes the
  // sea's distances from it while the land is built (third render speed pass). The board stands on that same map.
  it('hands the early terrain to the caller and builds the board on that map', async () => {
    const {map, assets, materials} = fixture(), worker = fakeWorker();
    const seen: unknown[] = [];
    const pending = buildPaintedBoardAsync(map, assets, materials, true, {workerFactory: () => worker, onTerrain: renderMap => seen.push(renderMap)});
    const reference = buildPaintedBoard(map, assets, materials); owned.push(reference);
    worker.onmessage?.call(worker, {data: {type: 'terrain', terrain: packTerrainMap(reference.renderMap)}} as MessageEvent);
    expect(seen).toHaveLength(1);
    const kit = packPaintedKit(assets, materials);
    worker.onmessage?.call(worker, {data: {type: 'complete', batches: packPaintedBatches(reference.exportBatches(), kit.bindings), terrain: null, buildMs: 1}} as MessageEvent);
    const {board} = await pending; owned.push(board);
    expect(board.renderMap).toBe(seen[0]);
    expect(fingerprint(board)).toBe(fingerprint(reference));
  });

  it('sends the prepared terrain once, as the land step starts, from the board build itself', () => {
    const {map, assets, materials} = fixture();
    const reports: [string, unknown][] = [];
    const board = buildPaintedBoard(map, assets, materials, true, null, (_done, _total, stage, prepared) => { if (prepared) reports.push([stage, prepared]); });
    owned.push(board);
    expect(reports).toHaveLength(1);
    expect(reports[0]![0]).toBe('land');
    expect(reports[0]![1]).toBe(board.renderMap);
  });
});
