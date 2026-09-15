import { describe, expect, it } from 'vitest';
import { DirectionalLight, Object3D, OrthographicCamera, Scene } from 'three';
// @ts-expect-error The browser helper is JavaScript, with no standalone declaration.
import { separatePaintedShadows } from '../../src/render3d/paintedShadows.js';

interface ShadowSubmission {
  light: DirectionalLight;
  casters: { name: string; x: number }[];
}

function fixture(bakeDetail?: (active: boolean) => void) {
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
  const controller = separatePaintedShadows({ shadowMap: map }, sun, counters, bakeDetail);
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
