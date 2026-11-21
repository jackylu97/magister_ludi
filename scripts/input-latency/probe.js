// Playwright installs this in a fresh browser context before the game starts.
(() => {
  const jobs = [], pending = new WeakMap();
  let active = null, depth = 0;
  function begin(group, name) {
    if (!active || active.feedback) return;
    const sample = active, start = performance.now(), level = depth++;
    return () => {
      depth--;
      sample.spans.push({ group, name, depth: level, start, end: performance.now() });
    };
  }
  function wrap(object, name, group, observe) {
    const original = object[name];
    if (typeof original !== 'function') throw Error(`Missing browser timing hook for ${name}`);
    object[name] = function (...args) {
      const stop = begin(group, name);
      try { return original.apply(this, args); }
      finally { stop?.(); if (active) observe?.(args); }
    };
  }
  for (const [name, field] of [['pointerdown','press'], ['pointerup','release']]) {
    window.addEventListener(name, event => {
      if (active && event.isTrusted) active[field] = { created: event.timeStamp, received: performance.now() };
    }, { capture: true });
  }
  const send = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (message, ...args) {
    if (message?.kind !== 'drive' || message.priority !== 'background') return send.call(this, message, ...args);
    let byId = pending.get(this);
    if (!byId) {
      byId = new Map(); pending.set(this, byId);
      this.addEventListener('message', ({ data }) => {
        const job = byId.get(data?.id);
        if (!job) return;
        job.reply = performance.now(); job.status = data.kind;
        if (Array.isArray(data.diagnosticWindow)) job.worker = data.diagnosticWindow.map(ms => ms - performance.timeOrigin);
        byId.delete(job.id);
      });
    }
    const job = { id: message.id, posted: performance.now() };
    jobs.push(job); byId.set(job.id, job);
    try { return send.call(this, message, ...args); }
    catch (error) { job.status = 'post failed'; byId.delete(job.id); throw error; }
    finally { job.postFinished = performance.now(); }
  };

  let renderer, game, cellCenter, reachableTiles;
  const frame = () => new Promise(requestAnimationFrame);
  async function setup() {
    ({ renderer, game } = window.__latencyGame);
    ({ cellCenter } = await import('/src/render3d/layout.ts'));
    ({ reachableTiles } = await import('/src/sim/pathfind.ts'));
    const seat = renderer.fogSeat;
    const home = game.state.cities.find(city => city.ownerId === seat) ?? game.state.units.find(unit => unit.ownerId === seat);
    if (!home || game.state.turnEnded[seat]) throw Error('The visible seat needs a live turn with units.');
    renderer.focusOpening(home);
    renderer.zoomBy(renderer.view.radius / 7, renderer.canvas.clientWidth / 2, renderer.canvas.clientHeight / 2);
    const deadline = performance.now() + 120000;
    while (renderer.paintedBoard?.groundPaint?.pending) {
      if (performance.now() > deadline) throw Error('Ground paint did not finish within two minutes.');
      await frame();
    }
    await frame(); await frame();
    for (const name of ['pick','pickUnitModel','pickUnitBadge']) wrap(renderer, name, 'picking');
    for (const name of ['syncStateLayers','rebuildUnits','rebuildOverlays','rebuildFog','rebuildLens']) wrap(renderer, name, 'board layers');
    wrap(renderer, 'loop', 'board frame');
    wrap(renderer, 'stepAnimations', 'walking pose');
    wrap(renderer.paintedLook, 'updateDynamicShadows', 'moving shadows');
    // The mirror is created on the first frame that sees water.
    const { SeaMirror } = await import('/src/render3d/seaMirror.ts');
    wrap(SeaMirror.prototype, 'render', 'water reflection');
    wrap(renderer.renderer.getContext(), 'getProgramInfoLog', 'shader diagnostics');
    wrap(renderer, 'animateMove', 'start walk', ([id, from]) => {
      if (active.expected.unit === id) active.from = cellCenter(from.col, from.row);
    });
    wrap(renderer.overlays, 'build', 'board layers', ([, settings]) => { active.ring = settings.selection; });
    wrap(renderer.paintedLook, 'render', 'board draw', () => {
      if (!active.release || active.feedback) return;
      const target = game.state.units.find(unit => unit.id === active.expected.unit);
      if (renderer.selectedUnitId !== target?.id) return;
      const at = performance.now();
      if (active.expected.kind === 'select') {
        if (!active.ring || active.ring.col !== target.col || active.ring.row !== target.row) return;
      } else {
        const walker = renderer.walkers.get(active.expected.unit);
        if (!walker || !active.from) return;
        const p = renderer.projectPoint(walker.position), start = renderer.projectPoint({ ...active.from, y: walker.position.y });
        const pixels = Math.hypot(p.x - start.x, p.y - start.y);
        active.walkFrames.push({ at, pixels });
        if (pixels < 1) return;
      }
      active.feedback = at;
    });
    return { seat, turn: game.state.turn, units: game.state.units.length, cities: game.state.cities.length,
      pixelRatio: renderer.renderer.getPixelRatio(), buffer: [renderer.canvas.width, renderer.canvas.height],
      gpu: renderer.benchmarkEnvironment().gpu, hardwareConcurrency: navigator.hardwareConcurrency, visibility: document.visibilityState };
  }
  function chooseActions() {
    const state = game.state, seat = renderer.fogSeat, rect = renderer.canvas.getBoundingClientRect();
    const viewport = document.querySelector('#viewport');
    function screen(cell, height = 0) {
      const projected = renderer.projectCell(cell.col, cell.row, height);
      if (!projected?.onScreen) return null;
      const x = Math.round(rect.left + projected.x), y = Math.round(rect.top + projected.y);
      if (x < rect.left + 230 || x > rect.right - 275 || y < rect.top + 100 || y > rect.bottom - 130) return null;
      const hit = document.elementFromPoint(x, y);
      return hit === viewport || hit === renderer.canvas || hit?.classList.contains('layer-3d') ? { x, y } : null;
    }
    const chosen = [];
    const visible = state.units.filter(unit => unit.ownerId === seat && !unit.trade && unit.movesLeft > 0 && renderer.units.isDrawing(unit.id));
    const distance = unit => {
      const point = screen(unit, .35);
      return point ? Math.hypot(point.x - (rect.left + rect.width / 2), point.y - (rect.top + rect.height / 2)) : Infinity;
    };
    visible.sort((a,b) => distance(a) - distance(b) || a.id - b.id);
    for (const unit of visible) {
      // A badge cycles the units on a shared tile. Use one-piece tiles for automatic targets.
      if (state.units.some(other => other.id !== unit.id && other.col === unit.col && other.row === unit.row)) continue;
      if (state.cities.some(city => city.col === unit.col && city.row === unit.row)) continue;
      const p = [.35,.15,0].map(height => screen(unit,height)).find(point => {
        if (!point || chosen.some(entry => Math.hypot(entry.select.x - point.x, entry.select.y - point.y) < 60)) return false;
        const x = point.x - rect.left, y = point.y - rect.top;
        const tile = renderer.pick(x,y)?.tile;
        return tile?.col === unit.col && tile.row === unit.row &&
          (renderer.pickUnitBadge(x,y,seat) ?? renderer.pickUnitModel(x,y,seat) ?? unit.id) === unit.id;
      });
      if (!p) continue;
      for (const {tile, cost, swap} of reachableTiles(state, unit)) {
        if (!cost || swap || state.visibility[seat][tile.row * state.map.width + tile.col] !== 2) continue;
        if ([...state.units, ...state.cities].some(entity => entity.row === tile.row && entity.col === tile.col)) continue;
        if (chosen.some(entry => entry.tile.col === tile.col && entry.tile.row === tile.row)) continue;
        const dest = screen(tile);
        if (!dest) continue;
        const picked = renderer.pick(dest.x - rect.left, dest.y - rect.top)?.tile;
        if (picked?.col !== tile.col || picked.row !== tile.row) continue;
        chosen.push({unit, tile, select: {kind:'select', unit:unit.id, ...p},
          move: {kind:'move', unit:unit.id, ...dest, target:{col:tile.col, row:tile.row}}});
        break;
      }
      if (chosen.length === 2) break;
    }
    if (chosen.length < 2) throw Error('The opening view needs two visible units with legal moves. Supply fixed actions for another view or save.');
    const [a,b] = chosen;
    return [a.select,b.select,a.select,b.select,a.select,a.move,b.select,b.move];
  }
  window.__inputLatency = { begin, setup, chooseActions, jobs,
    start(expected) { active = { expected, logBefore:game.log.length, spans:[], walkFrames:[] }; },
    feedback() { return active?.feedback ?? null; },
    failure() {
      const { x, y } = active.expected, el = document.elementFromPoint(x,y);
      return { selected:renderer.selectedUnitId, computedRing:active.ring, press:!!active.press, release:!!active.release,
        element:el?.id || el?.className, lastCommand:game.log.at(-1), walkFrames:active.walkFrames };
    },
    take() {
      const result = active; active = null;
      const commands = game.log.slice(result.logBefore);
      if (result.expected.kind === 'select' && commands.length) throw Error('Selection issued an unexpected command.');
      if (result.expected.kind === 'move' && !commands.some(command => command.type === 'moveUnit' && command.unitId === result.expected.unit &&
        command.target.col === result.expected.target.col && command.target.row === result.expected.target.row)) throw Error('Click did not issue the expected move.');
      return result;
    },
  };
})();
