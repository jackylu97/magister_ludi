/**
 * The two choices that trade a little of the mirror's picture for speed while
 * the player pans (the third render speed pass): `mirror.whileMoving` and
 * `mirror.works` in `data/view3d.json`. Both are on by default, which is the
 * picture as it was. These tests drive the real frame loop with WebGL stubbed
 * out, as `motionRest.test.ts` does, and look at when the mirror is drawn and
 * what it is told to leave out.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VIEW3D } from '../../src/render3d/lookData';
import { Renderer3D } from '../../src/render3d/renderer3d';
import { VTEST_UNIFORMS } from '../../src/render3d/visualTestLook';

interface Loop { loop(): void }
const MIRROR = VIEW3D.visualTest.coast.open.mirror;

function fixture() {
  const view = { stepPan: () => false, camera: { right: 1, left: -1 }, target: { x: 0, z: 0 }, frustum: 14, shadowRadius: 1, groundReach: 1 };
  const seaMirror = { render: vi.fn(), off: vi.fn() };
  const works = { group: { name: 'works' } };
  const data: Record<string, unknown> = {
    running: true, stateDirty: false, frameDirty: false, contextLost: false,
    state: null, map: null, board: null, mirrorBoardFor: null, mirrorOn: true, mirrorAll: false, seaDistances: {},
    mirrorBoardHidden: [], seaMirror, paintedWorks: works,
    tints: { group: {} }, territory: { group: {} }, lens: { group: {} }, overlays: { group: {} }, fog: null,
    roads: { group: {} }, improvements: { group: {} }, sites: { group: {} },
    animations: { pending: false }, glows: { pending: false }, walkers: new Map(), fallers: new Map(),
    vignette: { step: () => false, place: vi.fn(), mesh: {} },
    view, paintedBoard: null, fixedClock: 100,
    paintedLook: { setContactDetail: vi.fn(), updateTime: vi.fn(), invalidateDynamicShadows: vi.fn(), updateDynamicShadows: vi.fn(), render: vi.fn() },
    canvas: { clientWidth: 800, clientHeight: 600 },
    renderer: { getPixelRatio: () => 1, getDrawingBufferSize: vi.fn(), info: { reset: vi.fn(), render: { calls: 0, triangles: 0 } },
      shadowMap: { enabled: true, autoUpdate: false, needsUpdate: false } },
    scene: { updateMatrixWorld: vi.fn(), matrixWorldAutoUpdate: true }, copyCulling: { hide: vi.fn(), restore: vi.fn() },
    mirrorCamera: [NaN, NaN, NaN], mirrorMovedAt: -Infinity, mirrorSettleAt: null, mirrorSkips: 0,
    frameListener: null, lateProgramsScheduled: true, applyLight: vi.fn(), cityFocusAnchor: () => null,
    lastMotionFrame: 0, lastActivity: 0, motionRest: false, lastDrawn: 0, restingSince: null, restedMs: 0,
    // The water is in view, and the board's lists are made.
    waterInView: () => true, listMirrorBoard: vi.fn(),
  };
  const runtime = Object.assign(Object.create(Renderer3D.prototype), data) as Renderer3D;
  const frame = (): void => (runtime as unknown as Loop).loop();
  const pan = (): void => { view.target.x += .3; (runtime as unknown as { frameDirty: boolean }).frameDirty = true; };
  return { runtime, frame, pan, seaMirror, works, drawn: () => (data.paintedLook as { render: { mock: { calls: unknown[] } } }).render.mock.calls.length };
}

describe('the mirror while the camera moves', () => {
  let clock = 0;
  const kept = { ...MIRROR }, pattern = VTEST_UNIFORMS.vtestSeaPattern.value;
  beforeEach(() => {
    clock = 10_000;
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    VTEST_UNIFORMS.vtestSeaPattern.value = 5;
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); Object.assign(MIRROR, kept); VTEST_UNIFORMS.vtestSeaPattern.value = pattern; });

  it('is on by default: the shipped picture, with the mirror drawn on every frame of a pan and the works in it', () => {
    expect(MIRROR.whileMoving).toBe(true);
    expect(MIRROR.works).toBe(true);
    const f = fixture();
    for (let i = 0; i < 30; i++) { clock += 16; f.pan(); f.frame(); }
    expect(f.drawn()).toBe(30);
    expect(f.seaMirror.render).toHaveBeenCalledTimes(30);
    const hidden = f.seaMirror.render.mock.calls[0]![3] as unknown[];
    expect(hidden).not.toContain(f.works.group);
  });

  it('with whileMoving off, leaves the mirror out of a pan and draws it once the camera has been still for settleMs', () => {
    MIRROR.whileMoving = false;
    const f = fixture();
    // A drag: a pointer move on most frames, with a gap of two frames now and then.
    for (let i = 0; i < 40; i++) { clock += 16; if (i % 5 !== 3) f.pan(); f.frame(); }
    expect(f.seaMirror.render).not.toHaveBeenCalled();
    expect(f.seaMirror.off).toHaveBeenCalled();
    // The camera rests: no input, and the loop draws one more frame, with the mirror, after `settleMs`.
    const before = f.drawn();
    let waited = 0;
    while (waited < MIRROR.settleMs - 20) { clock += 16; waited += 16; f.frame(); }
    expect(f.seaMirror.render).not.toHaveBeenCalled();
    for (let i = 0; i < 4; i++) { clock += 16; f.frame(); }
    expect(f.seaMirror.render).toHaveBeenCalledTimes(1);
    expect(f.drawn()).toBe(before + 1);
    // And nothing more while the board stays still.
    for (let i = 0; i < 30; i++) { clock += 16; f.frame(); }
    expect(f.drawn()).toBe(before + 1);
  });

  it('with works off, tells the mirror to leave the works out', () => {
    MIRROR.works = false;
    const f = fixture();
    clock += 16; f.pan(); f.frame();
    const hidden = f.seaMirror.render.mock.calls[0]![3] as unknown[];
    expect(hidden).toContain(f.works.group);
  });
});
