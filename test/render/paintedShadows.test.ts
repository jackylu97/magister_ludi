import { describe, expect, it } from 'vitest';
import { DirectionalLight, Object3D, OrthographicCamera, Scene, Vector3, type WebGLRenderer } from 'three';
// @ts-expect-error The browser helper is JavaScript, with no standalone declaration.
import { createCounterShadows, separatePaintedShadows } from '../../src/render3d/paintedShadows.js';
import { DioramaCamera } from '../../src/render3d/camera3d';
import { VIEW3D } from '../../src/render3d/lookData';

interface ShadowSubmission {
  light: DirectionalLight;
  casters: { name: string; x: number }[];
}

function fixture(bakeDetail?: (active: boolean) => void, wrap?: { sweep(scene: Scene): number }) {
  const scene = new Scene(), camera = new OrthographicCamera();
  camera.layers.enable(2); camera.layers.enable(5);
  function caster(name: string, layer: number): Object3D {
    const object = new Object3D(); object.name = name;
    object.layers.set(layer); object.castShadow = true; scene.add(object);
    return object;
  }
  const terrain = caster('terrain', 0), unit = caster('unit', 2);
  const unrelated = caster('unrelated overlay', 5);
  const sun = new DirectionalLight(), counters = new DirectionalLight();
  sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = true;
  counters.shadow.autoUpdate = true;
  const submissions: ShadowSubmission[] = [];
  let failingLight: DirectionalLight | null = null;
  const map = {
    enabled: true, autoUpdate: false, needsUpdate: true,
    render(lights: DirectionalLight[], world: Scene, eye: OrthographicCamera): void {
      expect(this).toBe(map);
      if (!this.enabled || (!this.autoUpdate && !this.needsUpdate)) return;
      for (const light of lights) {
        if (!light.shadow.autoUpdate && !light.shadow.needsUpdate) continue;
        if (light === failingLight) throw new Error('shadow draw failed');
        const casters: ShadowSubmission['casters'] = [];
        // Match Three's WebGLShadowMap: the render camera, rather than each
        // light's shadow camera, controls which objects enter a depth map.
        world.traverse(object => {
          if (object.visible && object.castShadow && object.layers.test(eye.layers)) {
            casters.push({ name: object.name, x: object.position.x });
          }
        });
        submissions.push({ light, casters });
        light.shadow.needsUpdate = false;
      }
      this.needsUpdate = false;
    },
  };
  const original = map.render;
  const controller = separatePaintedShadows({ shadowMap: map }, sun, counters, bakeDetail, wrap);
  return {
    scene, camera, map, original, controller, sun, counters, submissions,
    terrain, unit, unrelated,
    failOn(light: DirectionalLight): void { failingLight = light; },
    draw(): void { map.render([sun, counters], scene, camera); },
  };
}

describe('painted static and moving shadows', () => {
  it('keeps terrain and moving units out of each other’s depth maps', () => {
    const f = fixture(), originalLayers = f.camera.layers.mask;
    f.unit.position.x = 3;
    f.draw();
    expect(f.submissions).toEqual([
      { light: f.sun, casters: [{ name: 'terrain', x: 0 }] },
      { light: f.counters, casters: [{ name: 'unit', x: 3 }] },
    ]);
    expect(f.controller.bakes).toBe(1);
    expect(f.camera.layers.mask).toBe(originalLayers);
    expect([f.terrain, f.unit, f.unrelated].every(object => object.castShadow)).toBe(true);
  });

  it('refreshes a moving shadow while retaining the static cache until invalidated', () => {
    const f = fixture(); f.draw();
    f.unit.position.x = 7; f.map.needsUpdate = true; f.draw();
    expect(f.submissions).toHaveLength(3);
    expect(f.submissions[2]).toEqual({ light: f.counters, casters: [{ name: 'unit', x: 7 }] });
    expect(f.controller.bakes).toBe(1);
    f.sun.shadow.needsUpdate = true; f.map.needsUpdate = true; f.draw();
    expect(f.submissions.slice(3).map(entry => entry.light)).toEqual([f.sun, f.counters]);
    expect(f.controller.bakes).toBe(2);
  });

  it('does no work when shadows are disabled or no frame requested them', () => {
    const f = fixture(), originalLayers = f.camera.layers.mask;
    f.map.enabled = false; f.draw();
    f.map.enabled = true; f.map.needsUpdate = false; f.draw();
    expect(f.submissions).toEqual([]);
    expect(f.controller.bakes).toBe(0);
    expect(f.camera.layers.mask).toBe(originalLayers);
  });

  it.each(['static', 'moving'] as const)('restores the color camera layers after a %s shadow error', kind => {
    const f = fixture(), originalLayers = f.camera.layers.mask;
    f.failOn(kind === 'static' ? f.sun : f.counters);
    expect(() => f.draw()).toThrow('shadow draw failed');
    expect(f.camera.layers.mask).toBe(originalLayers);
    expect(f.controller.bakes).toBe(kind === 'static' ? 0 : 1);
  });

  it('raises the near geometry around the static bake alone, and drops it again', () => {
    const detail: { active: boolean; submitted: number }[] = [];
    // Counting the submissions already made is what pins *where* the two flips
    // sit: raised before the sun's depth pass, dropped before the counters' —
    // and so, since Three builds the colour render list before either, never
    // while the colour pass can see it.
    const f = fixture(active => detail.push({ active, submitted: f.submissions.length }));
    f.draw();
    expect(detail).toEqual([{ active: true, submitted: 0 }, { active: false, submitted: 1 }]);
    expect(f.submissions.map(entry => entry.light)).toEqual([f.sun, f.counters]);
  });

  /**
   * The canonical-period lookup is installed from here rather than from a list
   * of materials, and this is where it has to happen: before the sun's own
   * submission, on the sun's arm only. On the counters' arm it would recompile
   * whatever a walking piece happened to stand on, for a map that never wraps.
   */
  it('teaches the scene to wrap before the static bake, and never on the counters’', () => {
    const swept: number[] = [];
    const f = fixture(undefined, { sweep(scene) { swept.push(f.submissions.length); expect(scene).toBe(f.scene); return 0; } });
    f.draw();
    expect(swept).toEqual([0]);
    f.unit.position.x = 5; f.map.needsUpdate = true; f.draw();
    expect(swept).toEqual([0]);
  });

  it('drops the near geometry again when the static bake throws', () => {
    const detail: boolean[] = [];
    const f = fixture(active => detail.push(active));
    f.failOn(f.sun);
    expect(() => f.draw()).toThrow('shadow draw failed');
    expect(detail).toEqual([true, false]);
    expect(f.controller.bakes).toBe(0);
  });

  it('counts each pass’s draws, triangles and milliseconds on its own ledger', () => {
    const f = fixture();
    // The wrapper reads the renderer's own counters; a fixture without them
    // still has to work, which is the `info?` in `separatePaintedShadows`.
    expect(f.controller.stats).toEqual({ bakes: 0, staticMs: 0, staticDraws: 0, staticTris: 0, counterMs: 0, counterDraws: 0, counterTris: 0 });
    f.draw();
    expect(f.controller.stats.bakes).toBe(1);
    expect(f.controller.stats.staticMs).toBeGreaterThanOrEqual(0);
    f.sun.shadow.needsUpdate = true; f.map.needsUpdate = true; f.draw();
    expect(f.controller.stats.bakes).toBe(2);
  });

  it('bakes without a detail hook at all, for a look with no board up yet', () => {
    const f = fixture();
    f.draw();
    expect(f.controller.bakes).toBe(1);
    expect(f.submissions.map(entry => entry.light)).toEqual([f.sun, f.counters]);
  });

  it('restores the exact original shadow renderer when disposed', () => {
    const f = fixture();
    expect(f.map.render).not.toBe(f.original);
    f.controller.dispose();
    expect(f.map.render).toBe(f.original);
  });
});

const GOLDEN: [number, number, number] = [.55, .85, -.35];
const DUSK: [number, number, number] = [-.6, .5, .4];
/** The 57° elevation's foreshortening — `DioramaCamera.groundReach`'s other axis. */
const DEPTH = 1 / Math.sin(VIEW3D.camera.elevation * Math.PI / 180);
const WIDE = 16 / 9, REFERENCE = 16 / 10, SQUARE = 1;
const reachOf = (radius: number, aspect: number): number => radius * Math.max(aspect, DEPTH);

/** A gate over a real light, with a renderer that is nothing but the flag it sets. */
function counters(coverage = VIEW3D.painted.shadows.counterCoverage) {
  const light = new DirectionalLight();
  const renderer = { shadowMap: { needsUpdate: false } } as unknown as WebGLRenderer;
  const gate = createCounterShadows(renderer, light, coverage);
  function frame(x = 0, z = 0, radius = 10, sun = GOLDEN, aspect = REFERENCE): boolean {
    renderer.shadowMap.needsUpdate = false;
    const target = new Vector3(x, 0, z), reach = reachOf(radius, aspect);
    const rendered = gate.update(target, radius, sun, reach);
    expect(renderer.shadowMap.needsUpdate).toBe(rendered);
    // The invariant the whole gate rests on: whatever it decided, the box is
    // never worse placed than one fitted on this very frame. Where the box can
    // cover the screen it still does, so a counter at the edge keeps its
    // shadow; where it cannot cover it even freshly fitted — a window wider
    // than the box's own cut — the fit is exact and nothing is lost to drift.
    const drift = gate.coverageTarget.distanceTo(target), margin = Math.max(0, gate.boxExtent - reach);
    expect(`drift ${drift.toFixed(3)} of ${margin.toFixed(3)}: ${drift <= margin + 1e-9 ? 'inside' : 'OUTSIDE'}`)
      .toBe(`drift ${drift.toFixed(3)} of ${margin.toFixed(3)}: inside`);
    return rendered;
  }
  return { gate, light, renderer, frame };
}

describe('the ground the frustum reaches', () => {
  it('is the wider of the two axes, and the gate is fed it', () => {
    const view = new DioramaCamera();
    // A wide window reaches furthest across; a tall one furthest along the
    // ground, because the 57° elevation foreshortens that axis and nothing
    // foreshortens the other.
    view.resize(1280, 800);
    expect(view.groundReach).toBeCloseTo(view.radius * REFERENCE);
    view.resize(800, 1280);
    expect(view.groundReach).toBeCloseTo(view.radius * DEPTH);
    // Which is exactly what this suite models when it drives the gate.
    view.resize(1280, 800);
    expect(view.groundReach).toBeCloseTo(reachOf(view.radius, REFERENCE));
  });
});

describe('the moving counters’ depth map', () => {
  it('fits and renders once, then leaves an idle pan alone', () => {
    const f = counters();
    expect(f.frame()).toBe(true);
    expect(f.light.shadow.camera.right).toBe(18);
    expect(f.light.position.y).toBeGreaterThan(0);
    // Every subsequent still frame, and every small pan inside the fitted box,
    // reuses the depth that is already in the map. At the shipped coverage a
    // 18-unit box tolerates 1.8 of drift, which is about one hex.
    for (let i = 0; i < 30; i++) expect(f.frame(i * .05, i * .02)).toBe(false);
  });

  it('re-renders for a piece that moved, arrived or left, once per ask', () => {
    const f = counters();
    f.frame();
    f.gate.invalidate();
    expect(f.frame()).toBe(true);
    expect(f.frame()).toBe(false);
  });

  it('re-fits when the view walks past its coverage, and on any zoom', () => {
    // A square window, where the box has 6 units spare and the coverage
    // ceiling of a quarter — 4.5 — is what binds.
    const f = counters(.25);
    f.frame(0, 0, 10, GOLDEN, SQUARE);
    const fitted = f.gate.coverageTarget.clone();
    expect(f.frame(4, 0, 10, GOLDEN, SQUARE)).toBe(false);
    expect(f.gate.coverageTarget).toEqual(fitted);
    expect(f.frame(5, 0, 10, GOLDEN, SQUARE)).toBe(true);
    expect(f.gate.coverageTarget.x).toBe(5);
    // A zoom changes the box itself, whatever the target did.
    expect(f.frame(5, 0, 11, GOLDEN, SQUARE)).toBe(true);
    expect(f.light.shadow.camera.right).toBeCloseTo(19.8);
  });

  it('spends only the slack the window actually leaves it', () => {
    // The same pan, the same knob, two windows. At 16:10 the box is 18 wide
    // against a 16-unit reach, and the tenth it is allowed — 1.8 — fits inside
    // that 2 units of spare. At 16:9 the reach is 17.78 and there is a fifth of
    // a unit to give, so the same drift has to move the box.
    const wide = counters(), reference = counters();
    wide.frame(0, 0, 10, GOLDEN, WIDE);
    reference.frame(0, 0, 10, GOLDEN, REFERENCE);
    expect(wide.frame(1, 0, 10, GOLDEN, WIDE)).toBe(true);
    expect(reference.frame(1, 0, 10, GOLDEN, REFERENCE)).toBe(false);
    // And a window wider than the box's own cut has nothing to give at all: it
    // fits on any movement, which is what the rig did before the gate.
    const wider = counters();
    wider.frame(0, 0, 10, GOLDEN, 2);
    expect(wider.frame(0, 0, 10, GOLDEN, 2)).toBe(false);
    expect(wider.frame(.01, 0, 10, GOLDEN, 2)).toBe(true);
  });

  it('never leaves the screen’s edge outside the box, at any aspect', () => {
    // The fixture asserts containment on every frame; this walks a long pan at
    // four windows so it is asserted against a real path rather than a point.
    // The zoom is held still on purpose — a radius that moved every frame would
    // re-fit the box every frame and assert nothing.
    const aspects = [SQUARE, REFERENCE, WIDE, 2.4];
    const fits = aspects.map(aspect => {
      const f = counters();
      let fitted = 0;
      for (let i = 0; i < 60; i++) {
        if (f.frame(Math.sin(i * .17) * 9, Math.cos(i * .11) * 5, 10, GOLDEN, aspect)) fitted++;
      }
      return fitted;
    });
    // Containment held at all four (the fixture asserted it 240 times), and the
    // price of it rises with the window: the narrower the view, the more of the
    // box is spare and the more frames keep the depth they already had.
    expect(fits[0]!).toBeGreaterThan(0);
    expect(fits.map((count, i) => i === 0 || count >= fits[i - 1]!)).not.toContain(false);
    expect(fits[0]!).toBeLessThan(fits[3]!);
  });

  it('fits frame-exactly at zero coverage, and still skips a still frame', () => {
    // The escape hatch the knob's docblock promises: a device that cannot
    // afford a stale box at the screen edge sets this to nothing and gets the
    // old per-frame fit back, minus the frames on which nothing moved at all.
    const f = counters(0);
    f.frame(0, 0);
    expect(f.frame(0, 0)).toBe(false);
    expect(f.frame(.001, 0)).toBe(true);
    expect(f.gate.coverageTarget.x).toBeCloseTo(.001);
  });

  it('never cuts the box below the floor, however far the camera zooms in', () => {
    const f = counters();
    f.frame(0, 0, 1);
    expect(f.light.shadow.camera.right).toBe(6);
  });

  it('follows the hour: a turned sun re-aims the rig and re-renders', () => {
    const f = counters();
    f.frame(0, 0, 10, GOLDEN);
    const morning = f.light.position.clone();
    expect(f.frame(0, 0, 10, GOLDEN)).toBe(false);
    expect(f.frame(0, 0, 10, DUSK)).toBe(true);
    expect(f.light.position.equals(morning)).toBe(false);
    expect(f.frame(0, 0, 10, DUSK)).toBe(false);
  });

  it('allocates no vector per frame', () => {
    const f = counters();
    f.frame();
    const position = f.light.position, target = f.light.target.position;
    for (let i = 0; i < 5; i++) f.frame(i * 6, 0);
    expect(f.light.position).toBe(position);
    expect(f.light.target.position).toBe(target);
  });
});

/**
 * The seams, read off the renderer's own source.
 *
 * A gate is only as good as the list of things that open it, and that list is
 * not visible from any one function: it is "every place a counter can appear,
 * vanish or move". Reading the source is how the other registers in this repo
 * are pinned, and it fails loudly when somebody adds a seventh way to put a
 * piece on layer 2 and forgets to say so.
 */
describe('the renderer’s counter-shadow seams', () => {
  // The renderer's own text, through Vite's raw glob rather than `node:fs`:
  // this project has no node typings. See `test/render/unitBars.test.ts`.
  const source = Object.values(import.meta.glob('../../src/render3d/renderer3d.ts', {
    query: '?raw', import: 'default', eager: true,
  }) as Record<string, string>)[0]!;
  const body = (name: string): string => {
    const start = source.indexOf(`\n  private ${name}(`) + 1;
    expect(`${name}: ${start > 0}`).toBe(`${name}: true`);
    return source.slice(start, source.indexOf('\n  }\n', start));
  };

  it.each(['rebuildUnits', 'addWalker', 'removeWalker', 'spawnFaller', 'removeFaller'])(
    'invalidates the moving map in %s', name => {
      expect(body(name)).toContain('invalidateDynamicShadows()');
    },
  );

  it('sets the walker and faller layer once at creation, never per frame', () => {
    expect(body('addWalker')).toContain('layers.set(2)');
    expect(body('spawnFaller')).toContain('layers.set(2)');
    // The loop asks the counters for a re-render while a walk is in flight, and
    // otherwise leaves both the layers and the depth map alone.
    const loop = body('loop');
    expect(loop).not.toContain('layers.set(2)');
    expect(loop).toContain('if (hadWalkers) this.paintedLook.invalidateDynamicShadows();');
  });

  it('writes the shadow flag over the painted board instead of rebuilding it', () => {
    const start = source.indexOf('\n  setShadows(');
    const toggle = source.slice(start, source.indexOf('\n  }\n', start));
    expect(toggle).toContain('this.paintedBoard.setShadows(enabled)');
    // The frozen toon board keeps its rebuild; the painted one must not reach it.
    expect(toggle).toContain('} else if (this.map) this.rebuildBoard(this.map);');
  });

  /**
   * The board is not the only thing standing when the switch is thrown. Every
   * painted layer that retains batches across a build holds the flag on its own
   * meshes, and each takes the toggle the same way — written over what is
   * already there. The works layer used to be rebuilt instead (its signature was
   * reset here), and the ground ribbons and the site props were told nothing at
   * all, so a game begun with shadows off kept unlit roads, borders, ruins and
   * camps after they were turned on.
   */
  it('hands the flag to every painted layer that retains batches', () => {
    const start = source.indexOf('\n  setShadows(');
    const toggle = source.slice(start, source.indexOf('\n  }\n', start));
    for (const layer of ['paintedWorks', 'paintedSites', 'paintedCities', 'paintedRoads', 'paintedTerritory'])
      expect(toggle, layer).toContain(`this.${layer}`);
    expect(toggle).toContain('layer?.setShadows(enabled)');
    // A signature reset here is a layer rebuild, which is the thing this stopped.
    expect(toggle).not.toContain('Signature = null');
  });
});
