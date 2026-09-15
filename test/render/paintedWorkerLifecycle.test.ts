import {type MockInstance, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Renderer3D} from '../../src/render3d/renderer3d';
import * as boardAsync from '../../src/render3d/paintedBoardAsync.js';
import {type PaintedBuildMetrics} from '../../src/render3d/paintedBoardAsync.js';
import {type PaintedBoard} from '../../src/render3d/paintedBoard.js';
import {createMap} from '../../src/sim/map';

// **A spy on the export, never `vi.mock`.** The suite runs with `isolate: false`
// (`vite.config.ts` says why), so a file's `vi.mock` cannot rewire a module the
// previous file in the same fork already evaluated — `renderer3d` kept its real
// binding and `preparePaintedMap` ran the real builder against the fixture's
// empty assets. A spy on the namespace is what the repo does everywhere
// (`test/ui/topBarCost.test.ts`), and it is restored after every case.
let buildPaintedBoardAsync: MockInstance<typeof boardAsync.buildPaintedBoardAsync>;
beforeEach(() => {
  buildPaintedBoardAsync = vi.spyOn(boardAsync, 'buildPaintedBoardAsync').mockImplementation(
    () => Promise.reject(new Error('unstubbed build')),
  );
});
afterEach(() => {vi.restoreAllMocks();});
const metrics: PaintedBuildMetrics = {mode:'worker',totalMs:10,workerMs:9,hydrateMs:1,frameCount:3,maxFrameGapMs:16};
function fixture() {
  // Exercise renderer handover without creating a GPU or browser canvas.
  const renderer = Object.create(Renderer3D.prototype) as Renderer3D;
  Object.assign(renderer,{running:true,paintedLook:{assets:{},materials:{}},shadows:true,boardBuild:null,preparedBoard:null});
  return renderer;
}
function board() {return {dispose:vi.fn()} as unknown as PaintedBoard;}
function pending() {
  let resolve!: (value: {board: PaintedBoard; metrics: PaintedBuildMetrics}) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{board: PaintedBoard; metrics: PaintedBuildMetrics}>((a,b) => {resolve=a;reject=b;});
  return {promise,resolve,reject};
}
describe('painted background build handover', () => {
  it('terminates superseded work and never installs a stale board', async () => {
    const renderer = fixture(), first = pending(), second = pending(), stale = board(), current = board();
    vi.mocked(buildPaintedBoardAsync).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const a = renderer.preparePaintedMap(createMap({width:2,height:2}));
    const rejected = expect(a).rejects.toMatchObject({name:'AbortError'});
    const firstSignal = vi.mocked(buildPaintedBoardAsync).mock.calls[0]![4]!.signal!;
    const b = renderer.preparePaintedMap(createMap({width:3,height:2}));
    expect(firstSignal.aborted).toBe(true);
    second.resolve({board:current,metrics}); await b;
    first.resolve({board:stale,metrics}); await rejected;
    expect(stale.dispose).toHaveBeenCalledOnce(); expect(current.dispose).not.toHaveBeenCalled();
    expect(renderer.paintedBuildMetrics).toBe(metrics);
    // A new request also releases a completed board not yet adopted by a game.
    vi.mocked(buildPaintedBoardAsync).mockRejectedValueOnce(new Error('worker failed'));
    await expect(renderer.preparePaintedMap(createMap({width:2,height:2}))).rejects.toThrow('worker failed');
    expect(current.dispose).toHaveBeenCalledOnce();
  });

  it('releases late output after renderer shutdown', async () => {
    const renderer = fixture(), work = pending(), result = board();
    vi.mocked(buildPaintedBoardAsync).mockReturnValueOnce(work.promise);
    const promise = renderer.preparePaintedMap(createMap({width:2,height:2}));
    Object.assign(renderer,{running:false});
    work.resolve({board:result,metrics});
    await expect(promise).rejects.toMatchObject({name:'AbortError'});
    expect(result.dispose).toHaveBeenCalledOnce();
  });

  it('allows a retry after a worker failure', async () => {
    const renderer = fixture(), result = board(), map = createMap({width:2,height:2});
    vi.mocked(buildPaintedBoardAsync).mockRejectedValueOnce(new Error('worker failed')).mockResolvedValueOnce({board:result,metrics});
    await expect(renderer.preparePaintedMap(map)).rejects.toThrow('worker failed');
    await renderer.preparePaintedMap(map);
    expect(renderer.paintedBuildMetrics).toBe(metrics); expect(result.dispose).not.toHaveBeenCalled();
  });
});
