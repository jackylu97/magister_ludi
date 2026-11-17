import { describe, expect, it } from 'vitest';
import {
  BackSide, BoxGeometry, DoubleSide, type Material, Mesh, MeshStandardMaterial, OrthographicCamera, Scene, Vector2, type WebGLRenderer,
} from 'three';
import { SeaMirror } from '../../src/render3d/seaMirror';

// The mirror pass clips at the water with a clipping plane, which three compiles into a program of its own, so each
// material drawn in both passes changed program twice a frame: 66 lookups a frame at turn 130 (render speed pass, third
// pass). The mirror now draws each material through a twin that reads everything from the material but keeps its own
// program state. These tests drive the pass with a stand-in renderer and look at what it was handed.

interface Drawn { object: Mesh; material: Material }

function standIn(onDraw: (scene: Scene) => void = () => {}): { renderer: WebGLRenderer; draws: Drawn[][] } {
  const draws: Drawn[][] = [];
  let target: unknown = null;
  const renderer = {
    clippingPlanes: [],
    getDrawingBufferSize: (size: Vector2) => size.set(64, 40),
    getRenderTarget: () => target,
    setRenderTarget: (next: unknown) => { target = next; },
    getClearAlpha: () => 1, setClearAlpha: () => {}, clear: () => {},
    render: (scene: Scene) => {
      const pass: Drawn[] = [];
      scene.traverseVisible(object => { if ((object as Mesh).isMesh) pass.push({ object: object as Mesh, material: (object as Mesh).material as Material }); });
      draws.push(pass);
      onDraw(scene);
    },
  } as unknown as WebGLRenderer;
  return { renderer, draws };
}

function scene(): { scene: Scene; meshes: Mesh[]; materials: MeshStandardMaterial[]; hiddenLayer: Mesh } {
  const s = new Scene(), materials = [new MeshStandardMaterial({ color: '#c08040' }), new MeshStandardMaterial({ side: DoubleSide })];
  const meshes = [new Mesh(new BoxGeometry(), materials[0]), new Mesh(new BoxGeometry(), materials[0]), new Mesh(new BoxGeometry(), materials[1])];
  const hiddenLayer = new Mesh(new BoxGeometry(), materials[1]);
  s.add(...meshes, hiddenLayer);
  return { scene: s, meshes, materials, hiddenLayer };
}

const camera = (): OrthographicCamera => { const c = new OrthographicCamera(-5, 5, 3, -3, .1, 100); c.position.set(0, 10, 10); c.lookAt(0, 0, 0); return c; };

describe('the mirror pass draws through twins', () => {
  it('draws each material through one twin that reads its values, and puts every material back', () => {
    const { scene: s, meshes, materials, hiddenLayer } = scene(), { renderer, draws } = standIn(), mirror = new SeaMirror();
    mirror.render(renderer, s, camera(), [hiddenLayer]);
    mirror.render(renderer, s, camera(), [hiddenLayer]);
    expect(draws).toHaveLength(2);
    for (const pass of draws) {
      // The hidden layer is not drawn, and every drawn object was handed a twin of its own material.
      expect(pass.map(d => d.object)).toEqual(meshes);
      for (const { object, material } of pass) {
        const original = meshes.indexOf(object) < 2 ? materials[0]! : materials[1]!;
        expect(material).not.toBe(original);
        expect(Object.getPrototypeOf(material)).toBe(original);
        // three's sort and caches read these: the twin answers with the material's own.
        const idOf = (m: Material): number => (m as unknown as { id: number }).id;
        expect(idOf(material)).toBe(idOf(original));
        expect(material.uuid).toBe(original.uuid);
        expect((material as MeshStandardMaterial).color).toBe(original.color);
        expect(material.version).toBe(original.version);
      }
    }
    // One twin a material, kept from frame to frame.
    expect(draws[0]![0]!.material).toBe(draws[1]![1]!.material);
    expect(draws[0]![0]!.material).toBe(draws[1]![0]!.material);
    expect(mirror.twinsMade).toBe(2);
    expect(meshes.map(mesh => mesh.material)).toEqual([materials[0], materials[0], materials[1]]);
    expect(hiddenLayer.visible).toBe(true);
  });

  it('takes three\'s writes off a twin after the pass, so the twin follows its material again', () => {
    const { scene: s, meshes, materials } = scene();
    const { renderer } = standIn(drawn => {
      // What three does to a double-sided transparent material between its two draws.
      const twin = (drawn.children[2] as Mesh).material as Material;
      twin.side = BackSide; twin.needsUpdate = true; twin.side = DoubleSide; twin.needsUpdate = true;
    });
    const mirror = new SeaMirror();
    mirror.render(renderer, s, camera(), []);
    materials[1]!.needsUpdate = true;
    const { renderer: second, draws } = standIn();
    mirror.render(second, s, camera(), []);
    const seen = draws[0]![2]!.material;
    expect(Object.keys(seen)).toEqual(['_listeners']);
    expect(seen.version).toBe(materials[1]!.version);
    expect(seen.side).toBe(DoubleSide);
    expect(meshes[2]!.material).toBe(materials[1]);
  });

  it('keeps the materials themselves in a pass that draws a shadow map', () => {
    const { scene: s, meshes, materials } = scene(), { renderer, draws } = standIn(), mirror = new SeaMirror();
    mirror.render(renderer, s, camera(), [], { shadowPass: true });
    expect(draws[0]!.map(d => d.material)).toEqual([materials[0], materials[0], materials[1], materials[1]]);
    expect(meshes[0]!.material).toBe(materials[0]);
  });

  it('disposes a twin with its material, and every twin with the mirror', () => {
    const { scene: s, materials } = scene(), { renderer, draws } = standIn(), mirror = new SeaMirror();
    mirror.render(renderer, s, camera(), []);
    const twins = [draws[0]![0]!.material, draws[0]![2]!.material];
    const disposed: Material[] = [];
    for (const twin of twins) twin.addEventListener('dispose', () => disposed.push(twin));
    materials[0]!.dispose();
    expect(disposed).toEqual([twins[0]]);
    mirror.render(renderer, s, camera(), []);
    expect(draws[1]![0]!.material).not.toBe(twins[0]);
    mirror.dispose();
    expect(disposed).toContain(twins[1]);
  });
});
