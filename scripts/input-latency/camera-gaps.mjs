/** Read the active board in a private Vite session. A resting board needs a pan to wake it. */
export async function findBoard() {
  const { Renderer3D } = await import('../../src/render3d/renderer3d.ts');
  const prototype = Renderer3D.prototype;
  const original = prototype.applyLight;
  let timer;
  try {
    return await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(Error('Open the board, then pan it once and retry.')), 10000);
      prototype.applyLight = function (...args) {
        const result = original.apply(this, args);
        if (this.paintedLook && this.state) resolve(this);
        return result;
      };
    });
  } finally {
    clearTimeout(timer);
    prototype.applyLight = original;
  }
}

const gaps = times => times.slice(1).map((time, i) => time - times[i]);
function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(fraction * sorted.length) - 1];
}

/** Each frame entry describes one completed call to the painted renderer. */
export function summarizeCamera(sample) {
  const intervals = gaps(sample.frames.map(frame => frame.at));
  return {
    boardFps: sample.frames.length * 1000 / sample.elapsedMs,
    boardFrames: sample.frames.length,
    medianGapMs: percentile(intervals, 0.5),
    p95GapMs: percentile(intervals, 0.95),
    longestGapMs: percentile(intervals, 1),
    gapsOver33ms: intervals.filter(ms => ms > 1000 / 30).length,
    gapsOver50ms: intervals.filter(ms => ms > 50).length,
    gapsOver100ms: intervals.filter(ms => ms > 100).length,
    p95RafGapMs: percentile(gaps(sample.raf), 0.95),
    medianDrawSubmissionMs: percentile(sample.frames.map(f => f.submitMs), 0.5),
    medianDrawCalls: percentile(sample.frames.map(f => f.calls), 0.5),
    medianTriangles: percentile(sample.frames.map(f => f.triangles), 0.5),
    lensRebuilds: sample.lensMs.length,
  };
}

/** Repeat one camera motion and restore its starting position, including after an error. */
export async function measureCamera(board, motion, durationMs = 2300) {
  if (!['pan', 'zoom'].includes(motion) || !Number.isFinite(durationMs) || durationMs <= 0)
    throw Error('Supply pan or zoom and a positive duration.');
  if (!board.paintedLook || document.visibilityState !== 'visible' || board.coverCheck?.())
    throw Error('Show the painted board and close any open game screen.');
  const { width, height } = board.canvas.getBoundingClientRect();
  const { x, z } = board.view.target, radius = board.view.radius;
  const sample = {
    motion, durationMs, turn: board.state.turn, target: [x, z], radius,
    buffer: [board.canvas.width, board.canvas.height], pixelRatio: board.renderer.getPixelRatio(),
    yields: board.lensView.yields, resources: board.lensView.resources, shadows: board.shadows,
    gpu: board.benchmarkEnvironment().gpu, frames: [], raf: [], lensMs: [], elapsedMs: 0,
  };
  const look = board.paintedLook, draw = look.render, rebuild = board.rebuildLens;
  const ownsRebuild = Object.hasOwn(board, 'rebuildLens');
  let timer, callback;
  try {
    look.render = function (...args) {
      const start = performance.now();
      const result = draw.apply(this, args);
      const at = performance.now();
      const { calls, triangles } = board.renderer.info.render;
      sample.frames.push({ at, submitMs: at - start, calls, triangles,
        radius: board.view.radius, x: board.view.target.x, z: board.view.target.z });
      return result;
    };
    board.rebuildLens = function (...args) {
      const start = performance.now();
      try { return rebuild.apply(this, args); }
      finally { sample.lensMs.push(performance.now() - start); }
    };
    const start = performance.now();
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(Error('Camera measurement timed out. Keep the board visible.')), durationMs + 10000);
      let previous = 0;
      function step() {
        try {
          if (document.visibilityState !== 'visible') throw Error('The board became hidden during the measurement.');
          const at = performance.now();
          if (previous === 1) { sample.elapsedMs = at - start; resolve(); return; }
          const progress = Math.min(1, (at - start) / durationMs);
          const a = previous * 2 * Math.PI, b = progress * 2 * Math.PI;
          sample.raf.push(at);
          if (motion === 'pan') board.panByScreen(110 * (Math.sin(b) - Math.sin(a)), 20 * (Math.cos(b) - Math.cos(a)));
          else board.zoomBy(Math.exp(0.155 * (Math.sin(b) - Math.sin(a))), width / 2, height / 2);
          previous = progress;
          callback = requestAnimationFrame(step);
        } catch (error) { reject(error); }
      }
      callback = requestAnimationFrame(step);
    });
  } finally {
    cancelAnimationFrame(callback);
    clearTimeout(timer);
    look.render = draw;
    if (ownsRebuild) board.rebuildLens = rebuild;
    else delete board.rebuildLens;
    board.zoomBy(board.view.radius / radius, width / 2, height / 2);
    board.view.panTo(x, z, false, performance.now());
    board.redraw();
  }
  return { summary: summarizeCamera(sample), sample };
}
