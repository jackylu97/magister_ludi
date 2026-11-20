import ts from 'typescript';

// These are the synchronous operations that can delay a board interaction.
// The private Vite server inserts timers in its served modules only.
export const timings = {
  'src/ui/controls.ts': {
    endDrag: 'controls', select: 'controls', commit: 'commit', issueMove: 'controls',
    refreshOverlays: 'overlays', attackableCells: 'range',
  },
  'src/main.ts': { updatePanel: 'HUD', noteEnemySighting: 'HUD', noteMeterPain: 'HUD' },
  'src/sim/commands.ts': { applyCommand: 'reducer', applyMoveUnit: 'move rules' },
  'src/sim/pathfind.ts': { findPath: 'route', planSwap: 'swap', reachableTiles: 'range', canStopOn: 'landing checks' },
  'src/sim/movement.ts': { advanceAlongPath: 'walk rules' },
  'src/sim/visibility.ts': { recomputeMarchSight: 'visibility', recomputeVisibility: 'visibility' },
  'src/sim/cities.ts': { refreshCityDerived: 'city update' },
  'src/sim/readings.ts': { readCity: 'economy readings', readEmpire: 'economy readings', readMeter: 'economy readings' },
  'src/sim/yields/town.ts': { explainCity: 'recalculate yields' },
  'src/sim/yields/empire.ts': { explainEmpireLines: 'recalculate yields' },
  'src/sim/slate.ts': { bumpEconomy: 'invalidate economy' },
};

function insertTimers(source, file, functions) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits = [], found = new Set();
  function visit(node) {
    const name = node.name?.text;
    if (ts.isFunctionDeclaration(node) && node.body && Object.hasOwn(functions, name)) {
      if (found.has(name)) throw Error(`Ambiguous timer for ${file} ${name}`);
      found.add(name);
      edits.push([node.body.getStart(ast) + 1, `\nconst endLatencySpan = globalThis.__inputLatency?.begin('${functions[name]}', '${name}'); try {\n`]);
      edits.push([node.body.end - 1, '\n} finally { endLatencySpan?.(); }\n']);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const name of Object.keys(functions)) if (!found.has(name)) throw Error(`Missing timer for ${file} ${name}`);
  for (const [offset, code] of edits.sort((a,b) => b[0] - a[0])) source = source.slice(0, offset) + code + source.slice(offset);
  return source;
}

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw Error(`Missing or ambiguous input diagnostic hook: ${before}`);
  return source.replace(before, after);
}

export function instrument(source, file) {
  // Both times belong to the coordinator's request. Worker timeOrigin converts
  // them to the page's clock without counting message delivery as planning.
  if (file === 'src/ui/bot.worker.ts') return replaceOnce(source, 'thinkMs: performance.now() - started,',
    'thinkMs: performance.now() - started, diagnosticWindow: [performance.timeOrigin + started, performance.timeOrigin + performance.now()],');
  if (!timings[file]) return;
  source = insertTimers(source, file, timings[file]);
  if (file === 'src/main.ts') {
    const hook = 'gameDisposers.push(() => renderer.dispose?.());';
    source = replaceOnce(source, hook, `${hook}\nglobalThis.__latencyGame = { renderer, get game() { return game; } };`);
    source = replaceOnce(source, '    civYields.render();', `    const endYieldStrip = globalThis.__inputLatency?.begin('HUD', 'civYields.render');
    try { civYields.render(); } finally { endYieldStrip?.(); }`);
    source += '\nglobalThis.__openLatencyGame = beginGame;\n';
  }
  return source;
}

/** Attribute each interval to its deepest synchronous operation. Parents include their children in the raw spans. */
export function exclusiveTimes(spans, start, end) {
  const edges = [];
  for (const span of spans) {
    const low = Math.max(start, span.start), high = Math.min(end, span.end);
    if (high > low) edges.push({ time: low, span, opening: true }, { time: high, span, opening: false });
  }
  const held = new Set(), totals = {};
  let cursor = start;
  for (const edge of edges.sort((a,b) => a.time - b.time)) {
    if (held.size && edge.time > cursor) {
      let inner;
      for (const span of held) if (!inner || span.depth > inner.depth) inner = span;
      totals[inner.group] = (totals[inner.group] ?? 0) + edge.time - cursor;
    }
    if (edge.opening) held.add(edge.span); else held.delete(edge.span);
    cursor = edge.time;
  }
  return totals;
}

/** Keep worker elapsed time separate from the main-thread intervals that we can attribute. */
export function summarizeInteraction(event, jobs, displayed) {
  const start = event.release.received, end = event.feedback;
  const costs = exclusiveTimes(event.spans, start, end);
  const tracked = Object.values(costs).reduce((sum, n) => sum + n, 0);
  const nextDisplay = displayed.find(time => time >= end);
  const ms = {
    pressQueue: event.press.received - event.press.created,
    releaseQueue: start - event.release.created,
    pressToDraw: end - event.press.created,
    releaseToDraw: end - event.release.created,
    handlerToDraw: end - start,
    exclusive: costs,
    unattributed: end - start - tracked,
    duringReleaseQueue: exclusiveTimes(event.spans, event.release.created, start),
    duringPressQueue: exclusiveTimes(event.spans, event.press.created, event.press.received),
    nextCompositorEventAfterDraw: nextDisplay === undefined ? null : nextDisplay - end,
  };
  function overlap(a, b, low = event.release.created, high = end) {
    return Math.max(0, Math.min(b, high) - Math.max(a, low));
  }
  const botOverlap = [];
  for (const job of jobs) {
    const inFlight = overlap(job.posted, job.reply ?? Infinity);
    if (inFlight === 0) continue;
    botOverlap.push({
      id: job.id,
      requestInFlightMs: inFlight,
      mainThreadPostMs: overlap(job.posted, job.postFinished),
      mainThreadPostDuringReleaseQueueMs: overlap(job.posted, job.postFinished, event.release.created, start),
      confirmedCoordinatorMs: job.worker ? overlap(...job.worker) : null,
      status: job.status ?? 'reply pending',
    });
  }
  return { ms, botOverlap };
}
