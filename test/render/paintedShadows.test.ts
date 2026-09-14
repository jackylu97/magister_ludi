import { describe, expect, it } from 'vitest';
import { DirectionalLight, Object3D, OrthographicCamera, Scene } from 'three';
// @ts-expect-error The browser helper is JavaScript, with no standalone declaration.
import { separatePaintedShadows } from '../../src/render3d/paintedShadows.js';

interface ShadowSubmission {
  light: DirectionalLight;
  casters: { name: string; x: number }[];
}

function fixture() {
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
  const controller = separatePaintedShadows({ shadowMap: map }, sun, counters);
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

  it('restores the exact original shadow renderer when disposed', () => {
    const f = fixture();
    expect(f.map.render).not.toBe(f.original);
    f.controller.dispose();
    expect(f.map.render).toBe(f.original);
  });
});
