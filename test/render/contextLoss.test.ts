/**
 * A lost WebGL context, and the rebuild after it comes back (WebGL audit
 * 2026-10-06, finding 2). The renderer is driven with WebGL stubbed out: the
 * real check, a lost and restored context in Chromium, is a browser run, and
 * these pin the order the rebuild takes and what the loop does meanwhile.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectionalLight, Group, Mesh, MeshBasicMaterial, BoxGeometry, Scene } from 'three';
import { Renderer3D, type GraphicsResetListener } from '../../src/render3d/renderer3d';
// @ts-expect-error The browser helper is JavaScript, with no standalone declaration.
import { installShadowTarget } from '../../src/render3d/paintedShadows.js';

interface Internals {
  loop(): void;
  contextWasLost(): void;
  recoverContext(): Promise<void>;
  tearDownPaintedLook(): void;
  warmLatePrograms(): void;
  benchmarkMemory(): { renderTargets: { name: string; width: number; bytesPerTexel: number }[] };
  contextLost: boolean;
  stateDirty: boolean;
  state: unknown;
}

function listener(): GraphicsResetListener & Record<'lost' | 'progress' | 'restored' | 'failed', ReturnType<typeof vi.fn>> {
  return { lost: vi.fn(), progress: vi.fn(), restored: vi.fn(), failed: vi.fn() };
}

function runtime(extra: Record<string, unknown> = {}) {
  const render = vi.fn();
  const data: Record<string, unknown> = {
    running: true, stateDirty: false, frameDirty: false, contextLost: false, recoveries: 0,
    state: null, map: null, hover: null, hoveredUnitId: null, board: null,
    animations: { pending: false, clear: vi.fn() }, deaths: { clear: vi.fn() }, glows: { pending: false, clear: vi.fn() }, walkers: new Map(), fallers: new Map(),
    vignette: { step: () => false, place: vi.fn(), focus: () => null },
    view: { stepPan: () => false, camera: { right: 1, left: -1 } },
    paintedBoard: null, paintedLook: null, daylight: 'golden',
    canvas: { clientWidth: 800, clientHeight: 600 },
    renderer: { render, info: { render: { calls: 0, triangles: 0 } } },
    units: { setHoveredUnitId: vi.fn(), clearHidden: vi.fn() },
    syncStateLayers: vi.fn(), applyLight: vi.fn(), cityFocusAnchor: () => null,
    clearWalkers: vi.fn(), clearFallers: vi.fn(), rebuildUnits: vi.fn(),
    fallerProgramKeep: [], ...extra,
  };
  const r = Object.assign(Object.create(Renderer3D.prototype), data) as Internals & Pick<Renderer3D, 'setContextListener' | 'invalidate'>;
  return { r, render, data };
}

describe('a lost context', () => {
  beforeEach(() => { vi.stubGlobal('requestAnimationFrame', () => 0); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('draws nothing while it is lost, and tells the page', () => {
    const { r, render } = runtime();
    const heard = listener();
    r.setContextListener(heard);
    r.contextWasLost();
    expect(heard.lost).toHaveBeenCalledOnce();
    r.invalidate();
    r.loop(); r.loop();
    expect(render).not.toHaveBeenCalled();
    // The request is kept for the first frame after the rebuild.
    expect(r.stateDirty).toBe(true);
  });

  it('comes back on the toon look with a redraw, since its arrays were never released', async () => {
    const { r, render } = runtime();
    const heard = listener();
    r.setContextListener(heard);
    r.contextWasLost();
    await r.recoverContext();
    expect(r.contextLost).toBe(false);
    expect(heard.restored).toHaveBeenCalledOnce();
    r.loop();
    expect(render).toHaveBeenCalledOnce();
  });
});

describe('the painted rebuild', () => {
  function painted() {
    const order: string[] = [];
    const state = { map: { id: 'map' } };
    let release: () => void = () => undefined;
    const prepared = new Promise<void>(resolve => { release = resolve; });
    const { r } = runtime({
      paintedLook: {}, state,
      tearDownPaintedLook: vi.fn(() => { order.push('tear down'); }),
      installPaintedLook: vi.fn(async (daylight: string) => { order.push(`install ${daylight}`); return true; }),
      preparePaintedMap: vi.fn(async (map: unknown, progress: (n: number) => void) => { order.push('prepare'); expect(map).toBe(state.map); progress(50); await prepared; }),
      rebuildBoard: vi.fn((map: unknown) => { order.push('board'); expect(map).toBe(state.map); }),
      setGameState: vi.fn(function (this: Internals, next: unknown) { order.push(`state (was ${this.state === null ? 'null' : 'set'})`); this.state = next; }),
    });
    const heard = listener();
    heard.restored.mockImplementation(() => { order.push('restored'); });
    r.setContextListener(heard);
    return { r, order, state, heard, release: () => release() };
  }

  it('takes the steps a new game takes, then hands the state over whole', async () => {
    const f = painted();
    f.r.contextWasLost();
    const done = f.r.recoverContext();
    await Promise.resolve(); await Promise.resolve();
    // Still rebuilding: nothing may draw the half-built board.
    expect(f.r.contextLost).toBe(true);
    expect(f.heard.progress).toHaveBeenCalledWith(50);
    f.release();
    await done;
    expect(f.order).toEqual(['tear down', 'install golden', 'prepare', 'board', 'state (was null)', 'restored']);
    expect(f.r.state).toBe(f.state);
    expect(f.r.contextLost).toBe(false);
  });

  it('stops when a second loss overtakes it', async () => {
    const f = painted();
    f.r.contextWasLost();
    const done = f.r.recoverContext();
    await Promise.resolve(); await Promise.resolve();
    f.r.contextWasLost();
    f.release();
    await done;
    expect(f.order).toEqual(['tear down', 'install golden', 'prepare']);
    expect(f.r.contextLost).toBe(true);
    expect(f.heard.restored).not.toHaveBeenCalled();
  });

  it('reports a rebuild that fails, and keeps the board dark', async () => {
    const f = painted();
    (f.r as unknown as { installPaintedLook: unknown }).installPaintedLook = vi.fn(async () => { throw new Error('assets'); });
    f.r.contextWasLost();
    await f.r.recoverContext();
    expect(f.heard.failed).toHaveBeenCalledOnce();
    expect(f.r.contextLost).toBe(true);
  });

  it('takes down the board, the passes holding it and every painted layer', () => {
    const scene = new Scene();
    const layer = () => { const group = new Group(); scene.add(group); return { group, dispose: vi.fn() }; };
    const layers = { paintedCities: layer(), paintedWorks: layer(), paintedSites: layer(), paintedRoads: layer(), paintedTerritory: layer() };
    const board = { group: new Group(), dispose: vi.fn() };
    scene.add(board.group);
    const fog = { group: new Group(), dispose: vi.fn() };
    scene.add(fog.group);
    const look = { setBakeDetail: vi.fn(), dispose: vi.fn() };
    const kit = { dispose: vi.fn() }, reveal = { dispose: vi.fn() };
    const { r } = runtime({ scene, board, paintedBoard: board, fog, reveal, paintedLook: look, paintedUnits: kit, map: null, boardBuild: null, preparedBoard: null, ...layers });
    r.tearDownPaintedLook();
    expect(scene.children).toHaveLength(0);
    for (const one of [...Object.values(layers), board, fog, kit, reveal, look]) expect(one.dispose).toHaveBeenCalledOnce();
    const fields = r as unknown as Record<string, unknown>;
    for (const name of ['board', 'paintedBoard', 'fog', 'reveal', 'paintedLook', 'paintedUnits', ...Object.keys(layers)]) expect(fields[name], name).toBeNull();
  });
});

describe('the programs a first gesture needs', () => {
  function warm(paintedLook: unknown) {
    let bound: unknown = null;
    const seen: { root: unknown; target: unknown }[] = [];
    const renderer = {
      getRenderTarget: () => bound,
      setRenderTarget: (target: unknown) => { bound = target; },
      compileAsync: vi.fn((root: unknown) => { seen.push({ root, target: bound }); return Promise.resolve(); }),
    };
    const vignette = { mesh: new Mesh(new BoxGeometry(), new MeshBasicMaterial()) };
    const body = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    body.userData.unitBody = true;
    const walker = new Group(); walker.add(body);
    const fallerMaterial = new MeshBasicMaterial({ transparent: true });
    const faller = new Group(); faller.add(new Mesh(new BoxGeometry(), fallerMaterial));
    const unit = { id: 1, type: 'warrior', ownerId: 0, col: 2, row: 2 };
    const { r } = runtime({
      renderer, vignette, paintedLook, fogSeat: 0,
      state: { units: [unit] }, map: {}, view: { camera: {}, stepPan: () => false },
      buildWalker: () => ({ group: walker, painted: undefined }),
      buildFaller: () => faller,
    });
    r.warmLatePrograms();
    return { r, seen, bound: () => bound, vignette, walker, faller, fallerMaterial };
  }

  it('compiles the wash, a walking piece, its shadow depth and a falling piece', () => {
    const w = warm({});
    const roots = w.seen.map(entry => entry.root);
    expect(roots).toContain(w.vignette.mesh);
    expect(roots).toContain(w.walker);
    expect(roots).toContain(w.faller);
    // The depth stand-in: three's default depth material on the body's shape.
    expect(roots).toHaveLength(4);
    const keep = (w.r as unknown as { fallerProgramKeep: unknown[] }).fallerProgramKeep;
    expect(keep).toContain(w.fallerMaterial);
    expect(keep.some(material => (material as { isMeshDepthMaterial?: boolean }).isMeshDepthMaterial)).toBe(true);
  });

  it('compiles the painted look against a render target, the variant its frame draws with', () => {
    const w = warm({});
    for (const entry of w.seen) expect(entry.target).not.toBeNull();
    expect(w.bound()).toBeNull();
  });

  it('compiles the toon look against the canvas, which is where it draws', () => {
    const w = warm(null);
    for (const entry of w.seen) expect(entry.target).toBeNull();
  });
});

describe('the memory ledger', () => {
  it('names each shadow map by its light and prices it from its real formats', () => {
    const fake = { state: { buffers: { depth: { getReversed: () => false } } } };
    const sun = new DirectionalLight(), counter = new DirectionalLight();
    sun.castShadow = counter.castShadow = true;
    // The low tier: the static map at the counter map's size, which the old
    // size-based label called a counter map.
    installShadowTarget(fake, sun, 2048);
    installShadowTarget(fake, counter, 2048);
    const scene = new Scene(); scene.add(sun, counter);
    const gl = { drawingBufferWidth: 1000, drawingBufferHeight: 500, getContextAttributes: () => ({ antialias: false, depth: false, stencil: false }) };
    const { r } = runtime({
      scene, paintedLook: { sun }, key: new DirectionalLight(), paintedBoard: null,
      renderer: { getContext: () => gl, info: { memory: { geometries: 0, textures: 0 }, programs: [] } },
    });
    const rows = r.benchmarkMemory().renderTargets;
    expect(rows.filter(row => row.name === 'static sun shadow map')).toHaveLength(1);
    expect(rows.filter(row => row.name === 'counter shadow map')).toHaveLength(1);
    // A one-byte colour attachment plus 32-bit depth.
    for (const row of rows.filter(one => one.name.includes('shadow'))) expect(row.bytesPerTexel).toBe(5);
    const canvas = rows.find(row => row.name.startsWith('canvas'))!;
    expect(canvas.bytesPerTexel).toBe(4);
  });
});
