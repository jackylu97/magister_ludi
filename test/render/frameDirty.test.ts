/**
 * The renderer keeps two reasons to draw apart: "the state may have changed"
 * (runs `syncStateLayers`, every fingerprint on the map) and "only the picture
 * is stale" (camera, hover, overlays). A pan used to pay the whole sweep on
 * every frame (WebGL audit 2026-10-06, finding 4). These tests drive the real
 * frame loop with WebGL stubbed out and count the sweeps.
 */
import { Group } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeathAnimations3D, MoveAnimations3D } from '../../src/render3d/animation3d';
import { Renderer3D } from '../../src/render3d/renderer3d';
import { TraitGlows } from '../../src/render3d/traitGlow';

interface Loop { loop(): void; syncStateLayers(): void }

function fixture(state: unknown = null) {
  const sync = vi.fn();
  const setBadgeSelection = vi.fn();
  const clearHidden = vi.fn();
  const isDrawing = vi.fn();
  const animations = new MoveAnimations3D();
  const deaths = new DeathAnimations3D();
  const glows = new TraitGlows();
  const walkers = new Map<number, Group>();
  const fallers = new Map<number, Group>();
  const walkerModels = new Map<number, unknown>();
  const remove = vi.fn();
  const rebuildUnits = vi.fn();
  const view = { pan: vi.fn(), zoomByFactor: vi.fn(), stepPan: () => false, camera: { right: 1, left: -1 } };
  const data: Record<string, unknown> = {
    running: true, stateDirty: false, frameDirty: false,
    state, map: null, fogSeat: null, hover: null, hoveredUnitId: null,
    animations, deaths, glows, walkers, fallers, walkerModels,
    vignette: { step: () => false, place: vi.fn(), focus: () => null, setFocus: vi.fn() },
    view, paintedBoard: null, paintedLook: null,
    canvas: { clientWidth: 800, clientHeight: 600 },
    renderer: { render: vi.fn(), info: { render: { calls: 0, triangles: 0 } } },
    units: { setHoveredUnitId: vi.fn(), setBadgeSelection, clearHidden, isDrawing },
    selectedUnitId: null, rebuildUnits,
    scene: { remove }, frameListener: null,
    syncStateLayers: sync, applyLight: vi.fn(), cityFocusAnchor: () => null,
    rebuildOverlays(this: { redraw(): void }) { this.redraw(); },
  };
  const runtime = Object.assign(Object.create(Renderer3D.prototype), data) as Renderer3D;
  const frame = (): void => (runtime as unknown as Loop).loop();
  const drawn = (): number => (data.renderer as { render: ReturnType<typeof vi.fn> }).render.mock.calls.length;
  return {
    runtime, sync, frame, drawn, setBadgeSelection, clearHidden, isDrawing, rebuildUnits,
    animations, deaths, glows, walkers, fallers, walkerModels, remove,
  };
}

describe('a camera frame draws without re-reading the state', () => {
  beforeEach(() => { vi.stubGlobal('requestAnimationFrame', () => 0); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('pans and zooms draw a frame and run no state sweep', () => {
    const f = fixture();
    for (let i = 0; i < 10; i++) {
      f.runtime.panByScreen(4, 2);
      f.frame();
      f.runtime.zoomBy(1.05, 400, 300);
      f.frame();
    }
    expect(f.drawn()).toBe(20);
    expect(f.sync).not.toHaveBeenCalled();
  });

  it('a hover move draws a frame and runs no state sweep', () => {
    const f = fixture();
    const tile = (n: number) => ({ tile: { col: n, row: 0 } }) as never;
    for (let i = 0; i < 5; i++) { f.runtime.setHover(tile(i)); f.frame(); }
    expect(f.drawn()).toBe(5);
    expect(f.sync).not.toHaveBeenCalled();
  });

  it('selection patches badge rims and draws a frame without rebuilding units', () => {
    const f = fixture();
    f.runtime.setSelectedUnitId(4);
    f.frame();
    f.runtime.setSelectedUnitId(4);
    f.frame();
    f.runtime.setSelectedUnitId(7);
    f.frame();
    f.runtime.setSelectedUnitId(null);
    f.frame();
    expect(f.setBadgeSelection.mock.calls).toEqual([[null, 4], [4, 7], [7, null]]);
    expect(f.rebuildUnits).not.toHaveBeenCalled();
    expect(f.sync).not.toHaveBeenCalled();
    expect(f.drawn()).toBe(3);
  });

  it('invalidate, the verb a command calls, runs the sweep once and then idles', () => {
    const f = fixture();
    f.runtime.invalidate();
    f.frame();
    expect(f.sync).toHaveBeenCalledOnce();
    expect(f.drawn()).toBe(1);
    // Nothing asked since: the loop returns without drawing.
    f.frame();
    expect(f.drawn()).toBe(1);
    // A pan after a command: the command's sweep has already run.
    f.runtime.panByScreen(3, 0);
    f.frame();
    expect(f.sync).toHaveBeenCalledOnce();
    expect(f.drawn()).toBe(2);
  });

  it('an overlay rebuilt inside the sweep does not ask for a second sweep', () => {
    const f = fixture();
    f.sync.mockImplementation(function (this: { rebuildOverlays(): void }) { this.rebuildOverlays(); });
    f.runtime.invalidate();
    f.frame();
    f.frame();
    expect(f.sync).toHaveBeenCalledOnce();
    expect(f.drawn()).toBe(1);
  });
});

describe('skipping unit animations', () => {
  it('defers an idle unit layer to the next dirty frame', () => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    try {
      const f = fixture({});
      f.runtime.skipAnimations();
      expect(f.clearHidden).toHaveBeenCalledOnce();
      expect(f.rebuildUnits).not.toHaveBeenCalled();
      expect(f.sync).not.toHaveBeenCalled();
      f.frame();
      f.frame();
      expect(f.sync).toHaveBeenCalledOnce();
      expect(f.drawn()).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each(['walk', 'walker mesh', 'fall', 'glow'] as const)('restores the unit layer when it skips a %s', (kind) => {
    const f = fixture({});
    const id = 1;
    const mesh = new Group();
    if (kind === 'walk') f.animations.start(id, { col: 0, row: 0 }, [{ col: 1, row: 0 }], 0);
    if (kind === 'walker mesh') {
      f.walkers.set(id, mesh);
      f.walkerModels.set(id, {});
    }
    if (kind === 'fall') {
      f.deaths.start(id, 0);
      f.fallers.set(id, mesh);
    }
    if (kind === 'glow') f.glows.start([id], 0);

    f.runtime.skipAnimations();
    expect(f.animations.pending).toBe(false);
    expect(f.deaths.activeUnits()).toEqual([]);
    expect(f.glows.pending).toBe(false);
    expect(f.walkers.size + f.fallers.size + f.walkerModels.size).toBe(0);
    if (kind === 'walker mesh' || kind === 'fall') expect(f.remove).toHaveBeenCalledWith(mesh);
    expect(f.clearHidden.mock.invocationCallOrder[0]).toBeLessThan(f.rebuildUnits.mock.invocationCallOrder[0]!);
    expect(f.rebuildUnits).toHaveBeenCalledOnce();
  });

  it('checks the updated unit layer when the handover starts a glow before the next frame', () => {
    const f = fixture({ units: [], wars: [] });
    f.rebuildUnits.mockImplementation(() => f.isDrawing.mockReturnValue(true));
    f.runtime.skipAnimations();
    expect(f.rebuildUnits).not.toHaveBeenCalled();

    f.runtime.glowUnits([1]);
    expect(f.rebuildUnits.mock.invocationCallOrder[0]).toBeLessThan(f.isDrawing.mock.invocationCallOrder[0]!);
    expect(f.glows.activeUnits()).toEqual([1]);
  });
});
