/**
 * The menu's option to stop the board's motion when idle (`setMotionRest`).
 * These tests drive the real frame loop with WebGL stubbed out and a clock of
 * their own, and count the frames drawn and the times the motion was drawn at.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error Node is provided by the test runner, outside the browser TS target.
import { readFileSync } from 'node:fs';
import { VIEW3D } from '../../src/render3d/lookData';
import { Renderer3D } from '../../src/render3d/renderer3d';
import { setVisualTest, visualTest } from '../../src/render3d/visualTest';

interface Loop { loop(): void }

const last = (values: readonly number[]): number => values[values.length - 1]!;

function fixture() {
  // The motion's clock at each frame drawn, and the page's clock then.
  const times: number[] = [], pageTimes: number[] = [];
  const paintedLook = {
    setContactDetail: vi.fn(), updateTime: (seconds: number) => { times.push(seconds); pageTimes.push(performance.now() / 1000); },
    invalidateDynamicShadows: vi.fn(), updateDynamicShadows: vi.fn(), render: vi.fn(),
  };
  const data: Record<string, unknown> = {
    running: true, stateDirty: false, frameDirty: false, contextLost: false,
    state: null, map: null, board: null, mirrorBoardFor: null, mirrorOn: false,
    animations: { pending: false }, glows: { pending: false }, walkers: new Map(), fallers: new Map(),
    vignette: { step: () => false, place: vi.fn() },
    view: { stepPan: () => false, camera: { right: 1, left: -1 }, target: { x: 0, z: 0 }, frustum: 14, shadowRadius: 1, groundReach: 1 },
    // The scene's one matrix walk a frame, and the wrap copies' culling (third render speed pass).
    scene: { updateMatrixWorld: vi.fn(), matrixWorldAutoUpdate: true }, copyCulling: { hide: vi.fn(), restore: vi.fn() },
    mirrorCamera: [NaN, NaN, NaN], mirrorMovedAt: -Infinity, mirrorSettleAt: null,
    paintedBoard: null, paintedLook, fixedClock: null,
    canvas: { clientWidth: 800, clientHeight: 600 },
    renderer: { getPixelRatio: () => 1, getDrawingBufferSize: vi.fn(), info: { reset: vi.fn(), render: { calls: 0, triangles: 0 } },
      shadowMap: { enabled: true, autoUpdate: false, needsUpdate: false } },
    frameListener: null, lateProgramsScheduled: true,
    applyLight: vi.fn(), cityFocusAnchor: () => null,
    // The class's own starting values, which `Object.create` does not run.
    lastMotionFrame: 0, lastActivity: 0, motionRest: false, lastDrawn: 0, restingSince: null, restedMs: 0,
  };
  const runtime = Object.assign(Object.create(Renderer3D.prototype), data) as Renderer3D;
  return { runtime, times, pageTimes, frame: (): void => (runtime as unknown as Loop).loop(), drawn: (): number => paintedLook.render.mock.calls.length };
}

describe('the motion rests when the board is left alone', () => {
  let clock = 0;
  const switches = visualTest();
  beforeEach(() => {
    clock = 10_000;
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    // The idle motion on, as the game page has it.
    setVisualTest({ idle: true });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); setVisualTest(switches); });

  /** Runs the loop at 60 frames a second for `seconds`. */
  const run = (f: ReturnType<typeof fixture>, seconds: number): void => {
    for (let i = 0; i < seconds * 60; i++) { clock += 1000 / 60; f.frame(); }
  };

  it('keeps the motion running for as long as the game is open while the option is off', () => {
    const f = fixture();
    run(f, 10);
    // `motionFps` frames a second, near enough: the loop draws on the first display frame past each interval.
    expect(f.drawn()).toBeGreaterThan(10 * VIEW3D.visualTest.motionFps * 0.7);
    // The clock is the page's own while the option is off, to the last bit.
    expect(f.times).toEqual(f.pageTimes);
  });

  it('stops the motion frames after the rest time, and starts them again at the next input', () => {
    const rest = VIEW3D.visualTest.motionRestSeconds;
    expect(rest).toBeGreaterThan(0);
    const f = fixture();
    f.runtime.setMotionRest(true);
    run(f, rest + 1);
    const resting = f.drawn();
    run(f, 20);
    expect(f.drawn()).toBe(resting);
    // A pointer move or a key (the window's listener calls `noteActivity`): the very next display frame draws.
    f.runtime.noteActivity();
    clock += 1000 / 60; f.frame();
    expect(f.drawn()).toBe(resting + 1);
  });

  it('starts again at a game change or a camera move', () => {
    const f = fixture();
    f.runtime.setMotionRest(true);
    run(f, VIEW3D.visualTest.motionRestSeconds + 5);
    const resting = f.drawn();
    f.runtime.invalidate();
    clock += 1000 / 60; f.frame();
    expect(f.drawn()).toBe(resting + 1);
    // Awake again: the motion frames go on after the frame the change asked for.
    run(f, 1);
    expect(f.drawn()).toBeGreaterThan(resting + 5);
  });

  it('goes on from where it stopped: the clock does not leap by the time rested', () => {
    const f = fixture();
    f.runtime.setMotionRest(true);
    run(f, VIEW3D.visualTest.motionRestSeconds + 1);
    const before = last(f.times);
    run(f, 60);
    f.runtime.noteActivity();
    clock += 1000 / 60; f.frame();
    const after = last(f.times);
    // The first frame after the rest shows the motion at the time it stopped at.
    expect(after).toBeCloseTo(before, 9);
    run(f, 1);
    // And it then runs at the page's rate, a minute behind the page's clock.
    expect(last(f.times) - after).toBeGreaterThan(0.8);
    expect(last(f.times) - after).toBeLessThan(1.1);
  });
});

describe('the wiring of the rest', () => {
  const source = readFileSync(new URL('../../src/render3d/renderer3d.ts', import.meta.url), 'utf8');
  it('listens for input on the window and stops listening when disposed', () => {
    expect(source).toContain("const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'wheel', 'keydown'] as const;");
    expect(source).toMatch(/for \(const type of ACTIVITY_EVENTS\) window\.addEventListener\(type, this\.onActivity/);
    expect(source).toMatch(/for \(const type of ACTIVITY_EVENTS\) window\.removeEventListener\(type, this\.onActivity/);
  });
  it('is a menu option, off by default and kept in the URL', () => {
    const main = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');
    expect(main).toContain("return new URLSearchParams(location.search).get('rest') === '1';");
    expect(main).toContain('renderer.setMotionRest(rest.checked);');
  });
});
