/**
 * Founding a town, and what the frame after it costs — `docs/flags.md` (xxxxx).
 *
 * The user reported a hitch on founding and suspected the new camera angle. The
 * measurement said the camera's share was real but was not the pitch itself: the
 * pitch's *arrival* used to re-face every billboarded layer a third of a second
 * after the town appeared, so one gesture paid for two full sweeps of the units,
 * the towns, the sites and the marks. These pins hold the three facts the fix
 * rests on.
 *
 *  · The layers are built against the pitch the camera is **going** to, so the
 *    sweep the founding was already making is the only one the gesture needs.
 *  · An eased frame asks the shadow rigs for nothing: the static sun is not
 *    re-fitted, and the counters' box neither moves nor re-renders, because a
 *    pitch-only ease moves no target and changes no zoom.
 *  · However many hexes a founding clears, the static sun bakes **once** — the
 *    invalidation is a flag, not a queue.
 *
 * Nothing here opens a GL context: the camera is arithmetic, the counter gate is
 * a rule over a light, and the renderer's sweep is exercised on the prototype the
 * way `paintedUpdateScope.test.ts` does.
 */

import { describe, expect, it, vi } from 'vitest';
import { DirectionalLight, Object3D, OrthographicCamera, Quaternion, Scene, Vector3, type WebGLRenderer } from 'three';

// @ts-expect-error The browser helper is JavaScript, with no standalone declaration.
import { createCounterShadows, separatePaintedShadows } from '../../src/render3d/paintedShadows.js';
import { DioramaCamera } from '../../src/render3d/camera3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { Renderer3D } from '../../src/render3d/renderer3d';
import { signCities, signCityCells, signTerritory } from '../../src/render3d/cities3d';
import { signImprovements, signImprovedCells } from '../../src/render3d/improvements3d';
import { signRoadCells } from '../../src/render3d/roads3d';
import { signSites } from '../../src/render3d/sites3d';
import { signUnits } from '../../src/render3d/pieces';
import { signFeatureCells } from '../../src/render3d/board3d';
import { createMap } from '../../src/sim/map';
import { createUnit, newGame } from '../../src/sim/state';
import { foundCityAt } from '../../src/sim/cities';
import { resetVisibility } from '../../src/sim/visibility';

const CAMERA = VIEW3D.camera;
const GOLDEN: [number, number, number] = [.55, .85, -.35];

// --- the camera --------------------------------------------------------------

/** The orientation an ortho camera at `degrees` of pitch settles into. */
function orientationAt(degrees: number): Quaternion {
  const view = new DioramaCamera();
  view.resize(1280, 800);
  view.setCityView(degrees === CAMERA.cityElevation, false, 0);
  return view.camera.quaternion.clone();
}

describe('the pitch the camera-facing layers are built against', () => {
  it('is the destination the moment the ease starts, and the live one otherwise', () => {
    const view = new DioramaCamera();
    view.resize(1280, 800);
    expect(view.elevationDegrees).toBe(CAMERA.elevation);
    expect(view.facing.angleTo(orientationAt(CAMERA.elevation))).toBeCloseTo(0, 6);

    view.setCityView(true, true, 0);
    // One frame in, the live eye has barely moved and the facing is already the
    // city angle's: a layer rebuilt now is rebuilt for where the camera lands.
    view.stepPan(CAMERA.panMs / 20);
    expect(view.elevationDegrees).toBeGreaterThan(CAMERA.elevation);
    expect(view.elevationDegrees).toBeLessThan(CAMERA.cityElevation);
    expect(view.facing.angleTo(orientationAt(CAMERA.cityElevation))).toBeCloseTo(0, 6);

    view.stepPan(CAMERA.panMs);
    expect(view.elevationDegrees).toBe(CAMERA.cityElevation);
    expect(view.facing.angleTo(view.camera.quaternion)).toBeCloseTo(0, 6);
  });

  it('turns back on the way out of a city screen, again from the first frame', () => {
    const view = new DioramaCamera();
    view.resize(1280, 800);
    view.setCityView(true, false, 0);
    view.setCityView(false, true, 0);
    view.stepPan(CAMERA.panMs / 20);
    expect(view.facing.angleTo(orientationAt(CAMERA.elevation))).toBeCloseTo(0, 6);
  });

  it('is the live orientation when reduced motion applies the endpoint at once', () => {
    const view = new DioramaCamera();
    view.resize(1280, 800);
    view.setCityView(true, false, 0);
    expect(view.isChangingAngle).toBe(false);
    expect(view.facing.angleTo(view.camera.quaternion)).toBeCloseTo(0, 6);
  });
});

// --- the shadow rigs across the ease ----------------------------------------

/** The counter gate over a real light, as `paintedShadows.test.ts` drives it. */
function counterGate() {
  const light = new DirectionalLight();
  const renderer = { shadowMap: { needsUpdate: false } } as unknown as WebGLRenderer;
  return { light, gate: createCounterShadows(renderer, light, VIEW3D.painted.shadows.counterCoverage) };
}

describe('an eased city pitch', () => {
  it.each([[1280, 800], [800, 1280]])('re-renders no counter map at %ix%i', (width, height) => {
    const view = new DioramaCamera();
    view.resize(width, height);
    const f = counterGate();
    // The frame before the gesture fits the box; everything after it is the
    // ease, and the ease must ask for nothing.
    expect(f.gate.update(view.target, view.shadowRadius, GOLDEN, view.groundReach)).toBe(true);
    const fitted = f.gate.coverageTarget.clone();
    view.setCityView(true, true, 0);
    let renders = 0;
    for (let frame = 1; frame <= 20; frame++) {
      view.stepPan(CAMERA.panMs * frame / 20);
      renders += Number(f.gate.update(view.target, view.shadowRadius, GOLDEN, view.groundReach));
    }
    expect(renders).toBe(0);
    expect(f.gate.coverageTarget).toEqual(fitted);
  });

  it('moves neither the pan target nor the zoom, which is why nothing re-fits', () => {
    const view = new DioramaCamera();
    view.resize(1280, 800);
    view.lookAtPoint(new Vector3(9, 0, 5));
    const target = view.target.clone(), radius = view.radius;
    view.setCityView(true, true, 0);
    for (let frame = 1; frame <= 20; frame++) {
      view.stepPan(CAMERA.panMs * frame / 20);
      expect(view.target.equals(target)).toBe(true);
      expect(view.radius).toBe(radius);
    }
  });
});

describe('the static sun across a founding', () => {
  it('bakes once however many hexes the town cleared', () => {
    const scene = new Scene(), camera = new OrthographicCamera();
    camera.layers.enable(2);
    const ground = new Object3D(); ground.layers.set(0); ground.castShadow = true; scene.add(ground);
    const sun = new DirectionalLight(), counters = new DirectionalLight();
    sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = false;
    let bakes = 0;
    const map = {
      enabled: true, autoUpdate: false, needsUpdate: false,
      render(lights: DirectionalLight[], _world?: Scene, _eye?: OrthographicCamera): void {
        if (!this.enabled || (!this.autoUpdate && !this.needsUpdate)) return;
        for (const light of lights) {
          if (!light.shadow.autoUpdate && !light.shadow.needsUpdate) continue;
          if (light === sun) bakes++;
          light.shadow.needsUpdate = false;
        }
        this.needsUpdate = false;
      },
    };
    const controller = separatePaintedShadows({ shadowMap: map }, sun, counters) as { bakes: number };
    // What a founding does: the town's own hex, its clutter, and every wood the
    // sweep finds felled, each through the one invalidation seam.
    const invalidate = (): void => { sun.shadow.needsUpdate = true; map.needsUpdate = true; };
    for (let cell = 0; cell < 19; cell++) invalidate();
    map.render([sun, counters], scene, camera);
    expect(controller.bakes).toBe(1);
    expect(bakes).toBe(1);
    // And the eased frames behind it bake nothing at all.
    for (let frame = 0; frame < 20; frame++) map.render([sun, counters], scene, camera);
    expect(controller.bakes).toBe(1);
  });
});

// --- the sweep ---------------------------------------------------------------

/**
 * A renderer standing on its own prototype, with every layer a counter — the
 * fixture `paintedUpdateScope.test.ts` uses, plus the camera and the wash, which
 * a founding reaches and a march does not.
 */
function sweepFixture() {
  const state = newGame({ seed: 7, sizeName: 'duel', players: [
    { name: 'A', color: '#ac3333', isHuman: true }, { name: 'B', color: '#3344ac', isHuman: true }] });
  state.map = createMap({ width: 12, height: 8, terrain: 'grassland' });
  state.units = []; state.cities = []; state.camps = []; state.tileOwner = Array(96).fill(null);
  resetVisibility(state); state.visibility[0]!.fill(2);
  createUnit(state, 0, 'settler', 2, 2);
  foundCityAt(state, 0, state.map.tiles[5 * 12 + 8]!);
  state.visibility[0]!.fill(2);

  const signatures = { units: signUnits, cities: signCities, territory: signTerritory,
    improvements: signImprovements, roads: signRoadCells, sites: signSites };
  const calls = Object.fromEntries(Object.keys(signatures).map(key => [key, vi.fn()])) as
    Record<keyof typeof signatures, ReturnType<typeof vi.fn>>;
  const lens = vi.fn(), overlays = vi.fn();
  const view = new DioramaCamera();
  view.resize(1280, 800);
  const data: Record<string, unknown> = {
    state, map: state.map, fogSeat: 0, visibilitySignatures: null, paintedBoard: null,
    paintedWorks: null, paintedCities: null, paintedLook: null, paintedSites: null,
    paintedRoads: null, paintedTerritory: null,
    // The roundels are up, because they are the lens's own camera-facing marks
    // and the reason a turned pitch has to reach this layer at all.
    lensView: { mode: 'none', yields: false, resources: true }, religionSignature: 0,
    clearedCitiesSignature: signCityCells(state), clearedImprovementsSignature: signImprovedCells(state),
    clearedFeaturesSignature: signFeatureCells(state.map),
    applyFog: () => ({ tiles: 0 }), applyReveal: () => null, reveal: null,
    setHoveredUnitId: vi.fn(), rebuildOverlays: overlays, rebuildLens: lens,
    cityBannerAnchors: new Map(), clearGround: vi.fn(),
    view, vignette: { focus: () => null, setFocus: vi.fn() }, invalidate: vi.fn(),
  };
  const runtime = Object.assign(Object.create(Renderer3D.prototype), data) as Renderer3D;
  for (const [key, sign] of Object.entries(signatures)) Object.assign(runtime, {
    [`rebuild${key[0]!.toUpperCase()}${key.slice(1)}`]: (shadowChanged?: boolean) => {
      calls[key as keyof typeof signatures](shadowChanged);
      Object.assign(runtime, { [`${key}Signature`]: sign(runtime.getGameState()!, 0) });
    },
  });
  runtime.setGameState(state);
  for (const call of [...Object.values(calls), lens, overlays]) call.mockClear();
  return { state, runtime, view, calls, lens, overlays };
}

describe('the town screen the founding opens', () => {
  it('rebuilds each camera-facing layer exactly once, on the next sweep', () => {
    const f = sweepFixture();
    f.runtime.setCityFocus({ col: 8, row: 5 }, true);
    // Nothing is built by the gesture itself: it turns the facing and asks for
    // a frame, and the sweep every accepted command already makes does the work.
    expect(f.calls.units).not.toHaveBeenCalled();
    expect(f.calls.cities).not.toHaveBeenCalled();

    f.runtime.setGameState(f.state);
    expect(f.calls.units).toHaveBeenCalledOnce();
    expect(f.calls.cities).toHaveBeenCalledOnce();
    expect(f.calls.sites).toHaveBeenCalledOnce();
    // A turned camera is not a moved town: the painted stones, which are not
    // billboards, are left exactly where they stand.
    expect(f.calls.cities).toHaveBeenLastCalledWith(false);
    expect(f.calls.sites).toHaveBeenLastCalledWith(false);
    // And the ground layers, which face nothing, are not touched at all.
    expect(f.calls.territory).not.toHaveBeenCalled();
    expect(f.calls.roads).not.toHaveBeenCalled();
    expect(f.calls.improvements).not.toHaveBeenCalled();
  });

  it('does not re-face a second time when the ease lands', () => {
    const f = sweepFixture();
    // `setCityFocus` starts the tween off the page's own clock, so the frames
    // that step it have to be sampled from there too.
    const began = performance.now();
    f.runtime.setCityFocus({ col: 8, row: 5 }, true);
    f.runtime.setGameState(f.state);
    const built = f.calls.units.mock.calls.length;
    // The whole of the ease, frame by frame, and then the arrival.
    for (let frame = 1; frame <= 21; frame++) f.view.stepPan(began + CAMERA.panMs * frame / 20);
    expect(f.view.isChangingAngle).toBe(false);
    f.runtime.setGameState(f.state);
    expect(f.calls.units.mock.calls.length).toBe(built);
  });

  it('turns the facing back when the screen closes, and only then', () => {
    const f = sweepFixture();
    f.runtime.setCityFocus({ col: 8, row: 5 }, false);
    f.runtime.setGameState(f.state);
    const built = f.calls.units.mock.calls.length;
    // The same subject twice is not a turn.
    f.runtime.setCityFocus({ col: 8, row: 5 }, false);
    f.runtime.setGameState(f.state);
    expect(f.calls.units.mock.calls.length).toBe(built);
    f.runtime.setCityFocus(null, false);
    f.runtime.setGameState(f.state);
    expect(f.calls.units.mock.calls.length).toBe(built + 1);
  });
});
