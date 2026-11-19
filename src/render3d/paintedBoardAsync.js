import {buildPaintedBoard, paintedRegionKey} from './paintedBoard.js';
import {VIEW3D} from './lookData';
import {restoreTerrainMap, riverStyle, coastStyle} from '../terrainStudy/surface.js';
import {packPaintedKit, unpackPaintedBatches} from './paintedBoardTransfer.js';

/** The steps a worker reports, in the order it reaches them. A split build shows the step its slowest part is on. */
const STEPS = ['shape', 'mountains', 'colours', 'rivers', 'coast', 'sea', 'land', 'overview', 'packing'];

/**
 * The parts of a split build: the far view's regions (`paintedRegionKey`),
 * shared among `count` workers so each has about the same work. A land hex
 * costs about four water hexes. The regions go out largest first, each to the
 * part with the least work so far. Any split gives the same board, because the
 * page sorts the parts' batches back into one build's order; the split only
 * decides how evenly the workers are loaded. One part is the whole map, `null`.
 */
export function paintedBuildParts(map, count) {
  if (count <= 1) return [null];
  const weights = new Map();
  for (const tile of map.tiles) {
    const key = paintedRegionKey(tile.col, tile.row);
    weights.set(key, (weights.get(key) ?? 0) + (['ocean', 'coast', 'lake'].includes(tile.terrain) ? 1 : 4));
  }
  const regions = [...weights].sort((a, b) => b[1] - a[1]);
  const parts = Array.from({length: Math.min(count, regions.length)}, () => ({regions: [], load: 0}));
  for (const [key, weight] of regions) {
    let least = parts[0];
    for (const part of parts) if (part.load < least.load) least = part;
    least.regions.push(key); least.load += weight;
  }
  return parts.length > 1 ? parts.map(({regions}, index) => ({regions, terrain: index === 0})) : [null];
}

/** How many workers build the board: the sheet's most, one fewer than the device's cores, and at least one. */
export function paintedBuildWorkers() {
  const cores = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(VIEW3D.painted.build.workers, cores - 1));
}

const byOrder = (a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || a.order[2] - b.order[2];

/**
 * One worker for each part of the build (`paintedBuildParts`): an abort
 * terminates every worker's CPU work and releases its buffers, and an error in
 * any part fails the build. The parts build at the same time on as many cores;
 * on a standard map four parts built the land and the far view several times
 * faster than one worker (the third render speed pass). Every part first works
 * out the whole map's shape, rivers and coast, because a hex's ground reads its
 * neighbours; only the land chunks and the far view are shared out.
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
// `ground` is the page's plan for the ground paint texture (`groundPaintPlan`), or null. Every part builds with it, and
// so does the page's hydrate, which puts the plain land's material on the plain land's batches.
export async function buildPaintedBoardAsync(map, assets, materials, shadows, {signal, onProgress = () => {}, onTerrain = null, terrainPort = null, workerFactory, workers, ground = null} = {}) {
  if (signal?.aborted) throw new DOMException('Board build cancelled', 'AbortError');
  const started = performance.now();
  if (!workerFactory && typeof Worker === 'undefined') {
    const board = buildPaintedBoard(map, assets, materials, shadows, null, undefined, null, null, null, ground);
    return {board, metrics: {mode: 'synchronous', totalMs: performance.now() - started, workerMs: 0, hydrateMs: 0, frameCount: 0, maxFrameGapMs: 0, stageMs: {}, longestSilenceMs: 0, parts: 1}};
  }
  const {packet: kit, bindings} = packPaintedKit(assets, materials);
  // A build handed a worker factory (the tests) runs as one part unless it asks for more.
  const parts = paintedBuildParts(map, workers ?? (workerFactory ? 1 : paintedBuildWorkers()));
  const spawned = parts.map(() => workerFactory ? workerFactory() : new Worker(new URL('./paintedBoard.worker.js', import.meta.url), {type: 'module'}));
  const result = await new Promise((resolve, reject) => {
    let done = false, frame = 0, frameCount = 0, maxFrameGapMs = 0, previous = performance.now();
    // How long each step took as the page saw it, and the longest wait between
    // two reports: the figures that say how slow a build was, and how long a
    // step can go without a word. With several parts, the step is the one the
    // slowest part is on, and the land's share is the parts' shares averaged.
    const stageMs = {};
    let stage = null, stageStarted = started, lastReport = started, longestSilenceMs = 0, reported = null;
    const heard = () => { const now = performance.now(); longestSilenceMs = Math.max(longestSilenceMs, now - lastReport); lastReport = now; return now; };
    const states = parts.map(() => ({step: -1, land: 0, complete: null}));
    // The prepared terrain, restored as soon as a part sends it (as the land step starts), and handed to
    // `onTerrain` while the land is still being built. The board is hydrated on this same map.
    let early = null;
    // Use callback execution time, not the shared RAF timestamp: a callback
    // queued before synchronous simulation generation can carry an old time.
    const tick = () => { const now = performance.now(); maxFrameGapMs = Math.max(maxFrameGapMs, now - previous); previous = now; frameCount++; frame = requestAnimationFrame(tick); };
    if (typeof requestAnimationFrame !== 'undefined') frame = requestAnimationFrame(tick);
    const finish = (error, value) => {
      if (done) return; done = true;
      if (frame) cancelAnimationFrame(frame);
      signal?.removeEventListener('abort', abort);
      for (const worker of spawned) { worker.onmessage = worker.onerror = worker.onmessageerror = null; worker.terminate(); }
      if (stage !== null) stageMs[stage] = (stageMs[stage] ?? 0) + performance.now() - stageStarted;
      if (error) reject(error); else resolve({...value, frameCount, maxFrameGapMs, stageMs, longestSilenceMs});
    };
    const abort = () => finish(new DOMException('Board build cancelled', 'AbortError'));
    signal?.addEventListener('abort', abort, {once: true});
    const report = (now, percent, next) => {
      if (next && next !== stage) {
        if (stage !== null) stageMs[stage] = (stageMs[stage] ?? 0) + now - stageStarted;
        stage = next; stageStarted = now;
      }
      if (parts.length > 1 && reported && reported[0] === percent && reported[1] === next) return;
      reported = [percent, next];
      onProgress(percent, next);
    };
    const LAND = STEPS.indexOf('land');
    spawned.forEach((worker, index) => {
      const state = states[index];
      worker.onerror = event => { event.preventDefault?.(); finish(new Error(event.message || 'Terrain worker failed')); };
      worker.onmessageerror = () => finish(new Error('Could not read terrain worker output'));
      worker.onmessage = ({data}) => {
        const now = heard();
        if (data.type === 'progress') {
          if (parts.length === 1) { report(now, data.percent, data.stage); return; }
          const step = STEPS.indexOf(data.stage);
          if (step > state.step) state.step = step;
          if (data.stage === 'land') state.land = data.percent;
          const slowest = Math.min(...states.map(s => s.step));
          if (slowest < 0) return;
          const land = states.reduce((sum, s) => sum + (s.step > LAND ? 100 : s.step === LAND ? s.land : 0), 0) / states.length;
          report(now, Math.floor(land), STEPS[slowest]);
        } else if (data.type === 'terrain') {
          early = restoreTerrainMap(data.terrain);
          try { onTerrain?.(early); } catch (error) { finish(error); }
        } else if (data.type === 'error') finish(new Error(data.message));
        else if (data.type === 'complete') {
          state.complete = data;
          if (states.every(s => s.complete)) {
            const pieces = states.map(s => s.complete);
            // Each part's batches carry their place in one whole build's order; sorted, they are that build's batches.
            const batches = pieces.length === 1 ? pieces[0].batches : pieces.flatMap(piece => piece.batches).sort(byOrder);
            finish(null, {batches, terrain: pieces.find(piece => piece.terrain)?.terrain, early, buildMs: Math.max(...pieces.map(piece => piece.buildMs))});
          }
        }
      };
    });
    // Input is cloned, never transferred: live prop assets must stay attached.
    // The one exception is `terrainPort`. It goes to the part that sends the
    // prepared terrain, so that part posts the terrain to the sea's bake
    // itself. When the page made that copy, it stopped for 6.5 s on the Giant
    // map (the third render speed pass).
    // With `painted.build.share`, the part that sends the terrain also works out
    // the map's shape and rivers for the others and posts them on a channel to
    // each (`buildPaintedBoard`'s `share`): with every part working them out,
    // they took 22 to 27 s of a Giant build on four parts, against 11 to 13 s
    // on one, and were its longest part (the third render speed pass).
    try {
      const sharing = parts.length > 1 && VIEW3D.painted.build.share && typeof MessageChannel !== 'undefined';
      const channels = sharing ? parts.slice(1).map(() => new MessageChannel()) : [];
      let next = 0;
      spawned.forEach((worker, index) => {
        const message = {map, kit, shadows, riverStyle: riverStyle(), coastStyle: coastStyle(), ground, ...(parts[index] ? {part: parts[index]} : {})};
        const transfer = [];
        if (terrainPort && (!parts[index] || parts[index].terrain)) { message.terrainPort = terrainPort; transfer.push(terrainPort); }
        if (sharing && parts[index].terrain) { message.shareTo = channels.map(channel => channel.port1); transfer.push(...message.shareTo); }
        else if (sharing) { message.shareFrom = channels[next++].port2; transfer.push(message.shareFrom); }
        worker.postMessage(message, transfer);
      });
    } catch (error) { finish(error); }
  });
  if (signal?.aborted) throw new DOMException('Board build cancelled', 'AbortError');
  const hydrateStart = performance.now();
  const board = buildPaintedBoard(map, assets, materials, shadows, unpackPaintedBatches(result.batches, bindings), undefined, result.early ?? restoreTerrainMap(result.terrain),
    null, null, ground);
  return {board, metrics: {mode: 'worker', totalMs: performance.now() - started, workerMs: result.buildMs,
    hydrateMs: performance.now() - hydrateStart, frameCount: result.frameCount, maxFrameGapMs: result.maxFrameGapMs,
    stageMs: result.stageMs, longestSilenceMs: result.longestSilenceMs, parts: parts.length}};
}
