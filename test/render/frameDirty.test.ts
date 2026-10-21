/**
 * The renderer keeps two reasons to draw apart: "the state may have changed"
 * (runs `syncStateLayers`, every fingerprint on the map) and "only the picture
 * is stale" (camera, hover, overlays). A pan used to pay the whole sweep on
 * every frame (WebGL audit 2026-10-06, finding 4). These tests drive the real
 * frame loop with WebGL stubbed out and count the sweeps.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Renderer3D } from '../../src/render3d/renderer3d';

interface Loop { loop(): void; syncStateLayers(): void }

function fixture() {
  const sync = vi.fn();
  const view = { pan: vi.fn(), zoomByFactor: vi.fn(), stepPan: () => false, camera: { right: 1, left: -1 } };
  const data: Record<string, unknown> = {
    running: true, stateDirty: false, frameDirty: false,
    state: null, map: null, hover: null, hoveredUnitId: null,
    animations: { pending: false }, glows: { pending: false }, walkers: new Map(), fallers: new Map(),
    vignette: { step: () => false, place: vi.fn(), focus: () => null, setFocus: vi.fn() },
    view, paintedBoard: null, paintedLook: null,
    canvas: { clientWidth: 800, clientHeight: 600 },
    renderer: { render: vi.fn(), info: { render: { calls: 0, triangles: 0 } } },
    units: { setHoveredUnitId: vi.fn() },
    scene: {}, frameListener: null,
    syncStateLayers: sync, applyLight: vi.fn(), cityFocusAnchor: () => null,
    rebuildOverlays(this: { redraw(): void }) { this.redraw(); },
  };
  const runtime = Object.assign(Object.create(Renderer3D.prototype), data) as Renderer3D;
  const frame = (): void => (runtime as unknown as Loop).loop();
  const drawn = (): number => (data.renderer as { render: ReturnType<typeof vi.fn> }).render.mock.calls.length;
  return { runtime, sync, frame, drawn };
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
