import {buildPaintedBoard} from './paintedBoard.js';
import {restoreTerrainMap, riverStyle, coastStyle} from '../terrainStudy/surface.js';
import {packPaintedKit, unpackPaintedBatches} from './paintedBoardTransfer.js';

/**
 * One worker per build: an abort terminates its CPU work and releases its buffers.
 *
 * There is no time limit. There was one of 120 s, and on a busy machine the
 * Giant map took longer, so the player was sent back to the title with no game
 * (the render speed pass, 2026-11-16). A limit cannot tell a slow build from a
 * stuck one: the worker reports as each step starts and as the land step counts
 * its chunks, but a step in progress says nothing, so any silence long enough
 * never to catch a slow step on a slow machine is just a longer fixed limit.
 * The build waits on nothing outside itself, so unless its own code has a
 * fault it ends or it fails, and a failure arrives as an error (the worker's
 * own `error` message, its `error` event, or a message that cannot be read).
 * Those are the only ways it fails. The loading sheet shows each report, so the
 * player can see that work goes on. On the Giant map under load the longest
 * wait between two reports was 8 s of a 185 s build.
 */
export async function buildPaintedBoardAsync(map, assets, materials, shadows, {signal, onProgress = () => {}, workerFactory} = {}) {
  if (signal?.aborted) throw new DOMException('Board build cancelled', 'AbortError');
  const started = performance.now();
  if (!workerFactory && typeof Worker === 'undefined') {
    const board = buildPaintedBoard(map, assets, materials, shadows);
    return {board, metrics: {mode: 'synchronous', totalMs: performance.now() - started, workerMs: 0, hydrateMs: 0, frameCount: 0, maxFrameGapMs: 0, stageMs: {}, longestSilenceMs: 0}};
  }
  const {packet: kit, bindings} = packPaintedKit(assets, materials);
  const worker = workerFactory ? workerFactory() : new Worker(new URL('./paintedBoard.worker.js', import.meta.url), {type: 'module'});
  const result = await new Promise((resolve, reject) => {
    let done = false, frame = 0, frameCount = 0, maxFrameGapMs = 0, previous = performance.now();
    // How long each step took as the page saw it, and the longest wait between
    // two reports: the figures that say how slow a build was, and how long a
    // step can go without a word.
    const stageMs = {};
    let stage = null, stageStarted = started, lastReport = started, longestSilenceMs = 0;
    const heard = () => { const now = performance.now(); longestSilenceMs = Math.max(longestSilenceMs, now - lastReport); lastReport = now; return now; };
    // Use callback execution time, not the shared RAF timestamp: a callback
    // queued before synchronous simulation generation can carry an old time.
    const tick = () => { const now = performance.now(); maxFrameGapMs = Math.max(maxFrameGapMs, now - previous); previous = now; frameCount++; frame = requestAnimationFrame(tick); };
    if (typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(tick);
    const finish = (error, value) => {
      if (done) return; done = true;
      if (frame) cancelAnimationFrame(frame);
      signal?.removeEventListener('abort', abort);
      worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate();
      if (stage !== null) stageMs[stage] = (stageMs[stage] ?? 0) + performance.now() - stageStarted;
      if (error) reject(error); else resolve({...value, frameCount, maxFrameGapMs, stageMs, longestSilenceMs});
    };
    const abort = () => finish(new DOMException('Board build cancelled', 'AbortError'));
    signal?.addEventListener('abort', abort, {once: true});
    worker.onerror = event => { event.preventDefault?.(); finish(new Error(event.message || 'Terrain worker failed')); };
    worker.onmessageerror = () => finish(new Error('Could not read terrain worker output'));
    worker.onmessage = ({data}) => {
      const now = heard();
      if (data.type === 'progress') {
        if (data.stage && data.stage !== stage) {
          if (stage !== null) stageMs[stage] = (stageMs[stage] ?? 0) + now - stageStarted;
          stage = data.stage; stageStarted = now;
        }
        onProgress(data.percent, data.stage);
      } else if (data.type === 'error') finish(new Error(data.message));
      else if (data.type === 'complete') finish(null, data);
    };
    // Input is cloned, never transferred: live prop assets must stay attached.
    try { worker.postMessage({map, kit, shadows, riverStyle: riverStyle(), coastStyle: coastStyle()}); } catch (error) { finish(error); }
  });
  if (signal?.aborted) throw new DOMException('Board build cancelled', 'AbortError');
  const hydrateStart = performance.now();
  const board = buildPaintedBoard(map, assets, materials, shadows, unpackPaintedBatches(result.batches, bindings), undefined, restoreTerrainMap(result.terrain));
  return {board, metrics: {mode: 'worker', totalMs: performance.now() - started, workerMs: result.buildMs,
    hydrateMs: performance.now() - hydrateStart, frameCount: result.frameCount, maxFrameGapMs: result.maxFrameGapMs,
    stageMs: result.stageMs, longestSilenceMs: result.longestSilenceMs}};
}
