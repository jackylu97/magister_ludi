import {buildPaintedBoard} from './paintedBoard.js';
import {restoreTerrainMap} from '../terrainStudy/surface.js';
import {packPaintedKit, unpackPaintedBatches} from './paintedBoardTransfer.js';

/** One worker per build: abort/timeout terminates CPU work and releases buffers. */
export async function buildPaintedBoardAsync(map, assets, materials, shadows, {signal, onProgress = () => {}, workerFactory} = {}) {
  if (signal?.aborted) throw new DOMException('Board build cancelled', 'AbortError');
  const started = performance.now();
  if (!workerFactory && typeof Worker === 'undefined') {
    const board = buildPaintedBoard(map, assets, materials, shadows);
    return {board, metrics: {mode: 'synchronous', totalMs: performance.now() - started, workerMs: 0, hydrateMs: 0, frameCount: 0, maxFrameGapMs: 0}};
  }
  const {packet: kit, bindings} = packPaintedKit(assets, materials);
  const worker = workerFactory ? workerFactory() : new Worker(new URL('./paintedBoard.worker.js', import.meta.url), {type: 'module'});
  const result = await new Promise((resolve, reject) => {
    let done = false, frame = 0, frameCount = 0, maxFrameGapMs = 0, previous = performance.now();
    // Use callback execution time, not the shared RAF timestamp: a callback
    // queued before synchronous simulation generation can carry an old time.
    const tick = () => { const now = performance.now(); maxFrameGapMs = Math.max(maxFrameGapMs, now - previous); previous = now; frameCount++; frame = requestAnimationFrame(tick); };
    if (typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(tick);
    const finish = (error, value) => {
      if (done) return; done = true;
      clearTimeout(timeout); if (frame) cancelAnimationFrame(frame);
      signal?.removeEventListener('abort', abort);
      worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate();
      if (error) reject(error); else resolve({...value, frameCount, maxFrameGapMs});
    };
    const abort = () => finish(new DOMException('Board build cancelled', 'AbortError'));
    const timeout = setTimeout(() => finish(new Error('Terrain construction timed out. Please try loading again.')), 120_000);
    signal?.addEventListener('abort', abort, {once: true});
    worker.onerror = event => { event.preventDefault?.(); finish(new Error(event.message || 'Terrain worker failed')); };
    worker.onmessageerror = () => finish(new Error('Could not read terrain worker output'));
    worker.onmessage = ({data}) => {
      if (data.type === 'progress') onProgress(data.percent);
      else if (data.type === 'error') finish(new Error(data.message));
      else if (data.type === 'complete') finish(null, data);
    };
    // Input is cloned, never transferred: live prop assets must stay attached.
    try { worker.postMessage({map, kit, shadows}); } catch (error) { finish(error); }
  });
  if (signal?.aborted) throw new DOMException('Board build cancelled', 'AbortError');
  const hydrateStart = performance.now();
  const board = buildPaintedBoard(map, assets, materials, shadows, unpackPaintedBatches(result.batches, bindings), undefined, restoreTerrainMap(result.terrain));
  return {board, metrics: {mode: 'worker', totalMs: performance.now() - started, workerMs: result.buildMs,
    hydrateMs: performance.now() - hydrateStart, frameCount: result.frameCount, maxFrameGapMs: result.maxFrameGapMs}};
}
