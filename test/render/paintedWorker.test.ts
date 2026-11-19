import {afterEach, describe, expect, it, vi} from 'vitest';
// @ts-expect-error Node is provided by the test runner, outside the browser TS target.
import {createHash} from 'node:crypto';
import {BoxGeometry, Mesh, MeshStandardMaterial} from 'three';
import {createMap} from '../../src/sim/map';
// @ts-expect-error Shared study surface helpers are JavaScript.
import {packTerrainMap, restoreTerrainMap, hillMounds, surfaceHeight, neighbour, setRiverStyle, setCoastStyle} from '../../src/terrainStudy/surface.js';
// @ts-expect-error Shared study surface helpers are JavaScript.
import * as surfaceModule from '../../src/terrainStudy/surface.js';
// @ts-expect-error The organic rivers are JavaScript.
import * as riversModule from '../../src/render3d/organicRivers.js';
import {buildPaintedBoard, paintedRegionKey, type PaintedBoard, type PaintedBoardMaterials, type PaintedVegetationAssets} from '../../src/render3d/paintedBoard.js';
import {buildPaintedBoardAsync, paintedBuildParts} from '../../src/render3d/paintedBoardAsync.js';
import {packPaintedKit, unpackPaintedKit, packPaintedBatches, unpackPaintedBatches, paintedTransferBuffers} from '../../src/render3d/paintedBoardTransfer.js';
// @ts-expect-error The sea's bake is JavaScript.
import {bakeSeaDistanceData} from '../../src/render3d/seaDistances.js';
import {VIEW3D} from '../../src/render3d/lookData';

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

  it('builds the same board on the page when workers are unavailable', async () => {
    const {map, assets, materials} = fixture();
    vi.stubGlobal('Worker', undefined);
    try {
      const {board, metrics} = await buildPaintedBoardAsync(map, assets, materials, true);
      const reference = buildPaintedBoard(map, assets, materials, true);
      owned.push(board, reference);
      expect(metrics.mode).toBe('synchronous');
      expect(fingerprint(board)).toEqual(fingerprint(reference));
    } finally {
      vi.unstubAllGlobals();
    }
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
    // Three regions in a row, kept small: the test builds the map five times, and a long synchronous build starves the
    // test runner's own messages under load (the fourth render speed pass shrank it from 24 by 20).
    const {map, assets, materials} = fixture(37, 3);
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
      // A turn of the event loop between builds, so the test runner's own messages are not held up behind them
      // (under load they timed out while this test ran: the fourth render speed pass).
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    expect(reports[reports.length - 1]).toEqual([100, 'packing']);
    const {board, metrics} = await pending; owned.push(board);
    expect(metrics.parts).toBe(3);
    for (const worker of workers) expect(worker.terminate).toHaveBeenCalledOnce();
    // The one-worker board, through the same packing and hydrate.
    await new Promise(resolve => setTimeout(resolve, 0));
    const whole = buildPaintedBoard(structuredClone(map), assets, materials); owned.push(whole);
    await new Promise(resolve => setTimeout(resolve, 0));
    const hydrated = buildPaintedBoard(map, assets, materials, true, unpackPaintedBatches(packPaintedBatches(whole.exportBatches(), kit.bindings), kit.bindings),
      undefined, restoreTerrainMap(packTerrainMap(whole.renderMap))); owned.push(hydrated);
    expect(board.exportBatches().length).toBe(whole.exportBatches().length);
    expect(fingerprint(board)).toBe(fingerprint(hydrated));
    expect(fingerprint(board)).toBe(fingerprint(whole));
  });

  // The fourth render speed pass: one part works out the map's shape and rivers and hands them to the others, which
  // build their land on them. The board must be the one a single worker builds, byte for byte, with organic rivers and
  // a free coast on, and the shape and the rivers must be worked out once.
  it('builds the one-worker board when one part hands the shape and the rivers to the others', {timeout: 120_000}, async () => {
    setRiverStyle({crest: 0, toe: 0, corner: .0008, organic: true, clearance: .2});
    setCoastStyle(true);
    try {
      // Two regions and two parts, kept small: the test builds the map four times, and a long synchronous test starves
      // the test runner's messages (the third pass met that in this file).
      const {map, assets, materials} = fixture(24, 6);
      map.tiles.forEach((tile, i) => { if (i % 11 === 5) tile.terrain = 'ocean'; });
      // A river along two rows, with both banks told about each edge.
      for (const row of [1, 4]) for (let col = 2; col < 20; col++) {
        const tile = map.tiles[row * 24 + col]!, other = neighbour(tile, map, 1);
        if (!other || [tile, other].some(t => ['ocean', 'lake', 'mountain'].includes(t.terrain))) continue;
        tile.riverEdges = (tile.riverEdges ?? 0) | 1 << 1; other.riverEdges = (other.riverEdges ?? 0) | 1 << 4;
      }
      const prepare = vi.spyOn(surfaceModule, 'prepareTerrainMap'), trace = vi.spyOn(riversModule, 'createOrganicRivers');
      const parts = paintedBuildParts(map, 2);
      expect(parts).toHaveLength(2);
      const posted: {kind: string; payload: unknown}[] = [];
      // As a port would: each message is a copy, made when it is posted.
      const publish = (kind: string, payload: unknown): void => { posted.push({kind, payload: structuredClone(payload)}); };
      // A turn of the event loop between builds, so the test runner's own messages are not held up behind them.
      const yieldToRunner = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));
      const built: PaintedBoard[] = [];
      for (const [index, part] of parts.entries()) {
        const share = index === 0 ? {publish}
          : {shape: structuredClone(posted.find(p => p.kind === 'shape')!.payload), rivers: structuredClone(posted.find(p => p.kind === 'rivers')!.payload)};
        const board = buildPaintedBoard(structuredClone(map), assets, materials, true, null, undefined, null, {regions: new Set(part!.regions)}, share);
        owned.push(board); built.push(board);
        await yieldToRunner();
      }
      expect(posted.map(p => p.kind)).toEqual(['shape', 'rivers']);
      expect(posted[1]!.payload).not.toBeNull();
      expect(prepare).toHaveBeenCalledTimes(1);
      expect(trace).toHaveBeenCalledTimes(1);
      for (const board of built.slice(1)) expect(board.renderMap.tiles).toEqual(built[0]!.renderMap.tiles);
      // Through the page's own merge, against one worker's board.
      const workers = parts.map(() => fakeWorker());
      let next = 0;
      const pending = buildPaintedBoardAsync(map, assets, materials, true, {workerFactory: () => workers[next++]!, workers: 2});
      const kit = packPaintedKit(assets, materials);
      workers.forEach((worker, index) => worker.onmessage?.call(worker, {data: {type: 'complete', batches: packPaintedBatches(built[index]!.exportBatches(), kit.bindings),
        terrain: index === 0 ? packTerrainMap(built[0]!.renderMap) : null, buildMs: 1}} as MessageEvent));
      const {board} = await pending; owned.push(board);
      await yieldToRunner();
      const whole = buildPaintedBoard(structuredClone(map), assets, materials); owned.push(whole);
      expect(trace).toHaveBeenCalledTimes(2);
      expect(fingerprint(board)).toBe(fingerprint(whole));
      for (let i = 0; i < map.tiles.length; i++) expect(hillMounds(board.renderMap.tiles[i])).toEqual(hillMounds(whole.renderMap.tiles[i]));
      // The page handed the parts their channels: ports out from the part that sends the terrain, one port in to each other part.
      const messages = workers.map(worker => vi.mocked(worker.postMessage).mock.calls[0]![0] as {shareTo?: unknown[]; shareFrom?: unknown});
      expect(messages[0]!.shareTo).toHaveLength(1);
      expect(messages.slice(1).every(message => message.shareFrom && !message.shareTo)).toBe(true);
      for (const message of messages) for (const port of [...(message.shareTo ?? []), message.shareFrom]) (port as MessagePort | undefined)?.close();
    } finally {
      setRiverStyle(null); setCoastStyle(false);
    }
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

  // The sea's bake gets the prepared terrain from the board worker through a port (fourth render speed pass):
  // the page no longer copies it on, which held the page for 6.5 s on the Giant map.
  it('hands the terrain port to the part that sends the terrain, and to no other', () => {
    const {map, assets, materials} = fixture(24, 20);
    for (const count of [1, 3]) {
      const workers = Array.from({length: count}, fakeWorker);
      let next = 0;
      const port = {} as MessagePort;
      void buildPaintedBoardAsync(map, assets, materials, true, {workerFactory: () => workers[next++]!, workers: count, terrainPort: port}).catch(() => {});
      const calls = workers.map(worker => vi.mocked(worker.postMessage).mock.calls[0]!);
      const carried = calls.map(([message]) => (message as {terrainPort?: MessagePort}).terrainPort ?? null);
      expect(carried.filter(Boolean)).toEqual([port]);
      const index = carried.indexOf(port);
      expect(calls[index]![1]).toContain(port);
      if (count > 1) expect((calls[index]![0] as {part: {terrain: boolean}}).part.terrain).toBe(true);
      for (const worker of workers) worker.onerror?.call(worker, {message: 'done', preventDefault() {}} as ErrorEvent);
      for (const [message] of calls) {
        const {shareTo = [], shareFrom} = message as {shareTo?: MessagePort[]; shareFrom?: MessagePort};
        for (const shared of [...shareTo, shareFrom]) shared?.close();
      }
    }
  });

  it('posts the prepared terrain to the port from the board worker, the same terrain the page gets', async () => {
    const {map, assets, materials} = fixture();
    const previous = (globalThis as {self?: unknown}).self;
    const posted: unknown[] = [];
    (globalThis as {self?: unknown}).self = {postMessage: (message: unknown) => posted.push(message)};
    try {
      // @ts-expect-error The worker is JavaScript; importing it sets `self.onmessage` on the stand-in above.
      await import('../../src/render3d/paintedBoard.worker.js');
      const worker = (globalThis as unknown as {self: {onmessage: (event: {data: unknown}) => void}}).self;
      const sent: unknown[] = [];
      const port = {postMessage: vi.fn((message: unknown) => sent.push(message)), close: vi.fn()};
      worker.onmessage({data: {map, kit: packPaintedKit(assets, materials).packet, shadows: true, riverStyle: null, coastStyle: null, terrainPort: port}});
      const early = posted.find(message => (message as {type: string}).type === 'terrain') as {terrain: unknown};
      expect(early).toBeDefined();
      expect(sent).toHaveLength(1);
      expect((sent[0] as {terrain: unknown}).terrain).toBe(early.terrain);
      expect(port.close).toHaveBeenCalledOnce();
      expect(posted.some(message => (message as {type: string}).type === 'complete')).toBe(true);
    } finally {
      (globalThis as {self?: unknown}).self = previous;
    }
  });

  it('bakes the sea from the terrain that arrives on its port, as it would from terrain the page sent', async () => {
    const {map, assets, materials} = fixture();
    const built = buildPaintedBoard(map, assets, materials); owned.push(built);
    const knobs = VIEW3D.visualTest.coast;
    const expected = bakeSeaDistanceData(restoreTerrainMap(structuredClone(packTerrainMap(built.renderMap))), knobs, null);
    const previous = (globalThis as {self?: unknown}).self;
    const posted: {type: string; baked?: {data: Uint16Array}}[] = [];
    const arrived = new Promise<void>(resolve => {
      (globalThis as {self?: unknown}).self = {postMessage: (message: {type: string}) => { posted.push(message); resolve(); }};
    });
    try {
      // @ts-expect-error The worker is JavaScript; importing it sets `self.onmessage` on the stand-in above.
      await import('../../src/render3d/seaDistances.worker.js');
      const worker = (globalThis as unknown as {self: {onmessage: (event: {data: unknown}) => void}}).self;
      const channel = new MessageChannel();
      worker.onmessage({data: {port: channel.port2, knobs, organicRivers: null, riverStyle: null, coastStyle: null}});
      expect(posted).toHaveLength(0);
      channel.port1.postMessage({terrain: packTerrainMap(built.renderMap)});
      await arrived;
      channel.port1.close();
      expect(posted[0]!.type).toBe('baked');
      expect(Array.from(posted[0]!.baked!.data)).toEqual(Array.from(expected.data));
    } finally {
      (globalThis as {self?: unknown}).self = previous;
    }
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
