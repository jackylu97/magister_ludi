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
import type { BoardCover } from '../../src/ui/mapView';

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

describe('the motion is not drawn under a screen over the board', () => {
  let clock = 0;
  const switches = visualTest();
  beforeEach(() => {
    clock = 10_000;
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    setVisualTest({ idle: true });
  });
  afterEach(() => {
    vi.restoreAllMocks(); vi.unstubAllGlobals(); setVisualTest(switches);
    VIEW3D.painted.canvas.restUnderCover = true; VIEW3D.painted.canvas.restUnderSheets = true;
  });

  const run = (f: ReturnType<typeof fixture>, seconds: number): void => {
    for (let i = 0; i < seconds * 60; i++) { clock += 1000 / 60; f.frame(); }
  };

  for (const kind of ['opaque', 'dimmed'] as const) {
    it(`draws no motion frame under ${kind === 'opaque' ? 'an opaque screen' : 'a sheet that dims the board'}, and draws on the first display frame after`, () => {
      const f = fixture();
      let cover: BoardCover | null = null, asked = 0;
      f.runtime.setCoverCheck(() => { asked++; return cover; });
      run(f, 1);
      const open = f.drawn();
      expect(open).toBeGreaterThan(10);
      cover = kind;
      run(f, 10);
      expect(f.drawn()).toBe(open);
      // Asked on every display frame while covered, so the end of the cover is seen at once.
      asked = 0; run(f, 1); expect(asked).toBe(60);
      cover = null;
      clock += 1000 / 60; f.frame();
      expect(f.drawn()).toBe(open + 1);
      // The motion's clock did not stop under the cover: the frame shows the motion at the page's own time.
      expect(f.times).toEqual(f.pageTimes);
    });
  }

  it('still draws a frame asked for by anything else', () => {
    for (const kind of ['opaque', 'dimmed'] as const) {
      const f = fixture();
      f.runtime.setCoverCheck(() => kind);
      run(f, 1);
      const covered = f.drawn();
      f.runtime.invalidate();
      clock += 1000 / 60; f.frame();
      expect(`${kind}: ${f.drawn()}`).toBe(`${kind}: ${covered + 1}`);
    }
  });

  it('asks only when a motion frame is due', () => {
    const f = fixture();
    let asked = 0;
    f.runtime.setCoverCheck(() => { asked++; return null; });
    run(f, 10);
    // One frame of the run is drawn for the mirror's settle after the first draw, not for the motion.
    expect(asked).toBe(f.drawn() - 1);
  });

  it('keeps drawing the motion under each kind of cover when that kind\'s setting is off', () => {
    const full = 10 * VIEW3D.visualTest.motionFps * 0.7;
    VIEW3D.painted.canvas.restUnderCover = false;
    const underOpaque = fixture();
    underOpaque.runtime.setCoverCheck(() => 'opaque');
    run(underOpaque, 10);
    expect(underOpaque.drawn()).toBeGreaterThan(full);
    // The other kind keeps its own setting.
    const underSheet = fixture();
    underSheet.runtime.setCoverCheck(() => 'dimmed');
    run(underSheet, 10);
    expect(underSheet.drawn()).toBeLessThan(5);
    VIEW3D.painted.canvas.restUnderCover = true;
    VIEW3D.painted.canvas.restUnderSheets = false;
    const underSheetOff = fixture();
    underSheetOff.runtime.setCoverCheck(() => 'dimmed');
    run(underSheetOff, 10);
    expect(underSheetOff.drawn()).toBeGreaterThan(full);
  });

  it('is answered by the page: opaque screens, then the dimming sheets, each once its opening fade has ended', () => {
    const main = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');
    expect(main).toContain('const opaqueScreens = [statecraftOverlayEl, abacusOverlayEl, landingEl];');
    // The star chart and every sheet on the shared frame but the loading sheet.
    expect(main).toContain("...document.querySelectorAll<HTMLElement>('.statecraft-overlay:not(.loading-overlay)')");
    expect(main).toMatch(/const dimmingScreens = \[\s*techOverlayEl,/);
    expect(main).toContain("screen.getAnimations().every((fade) => fade.playState === 'finished')");
    expect(main).toContain("opaqueScreens.some(settled) ? 'opaque' : dimmingScreens.some(settled) ? 'dimmed' : null");
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
