/**
 * The sea as a mirror (the visual test, 2026-11-13; `docs/flags.md`, "Calm
 * water under the sun").
 *
 * Calm water shows what stands beside it upside down: trees, houses, rocks,
 * ships. To draw that, the scene is drawn a second time, before the frame,
 * from a camera that is the real camera's mirror image in the water's surface.
 * Only what is above the water is drawn, into a picture smaller than the
 * screen. The sea's paint then reads that picture at the same place on the
 * screen and lays it over the water (`SEA_GLSL`, `SEA_LIGHT_GLSL`).
 *
 * This costs a second pass over the scene's geometry each frame. It is behind
 * `visualTest.coast.open.mirror.on`, and the scene page's `mirror=0` turns it
 * off, so the cost can be compared.
 *
 * The mirror pass draws each material through a twin (`twinOf`). The pass
 * clips at the water with a clipping plane, and three compiles a material with
 * a clipping plane as a program of its own. A material drawn in both passes
 * so changed program twice a frame, and each change makes three work out the
 * material's whole set of program parameters and its cache key again: 66 such
 * lookups a frame at the middle zoom of a turn-130 game, about a sixth of the
 * frame's CPU time on a loaded machine. A twin is the material itself seen
 * through a prototype link: every property, uniform and shader hook is the
 * material's own, so it draws the same pixels with the same clipped program,
 * but three keeps its program state apart. So the twin stays on the clipped
 * program and the material stays on the plain one, and neither changes.
 */

import {
  HalfFloatType, LinearFilter, type Material, Matrix4, type Object3D, OrthographicCamera, Plane, type Scene, Vector2, Vector3,
  type WebGLRenderer, WebGLRenderTarget,
} from 'three';

// @ts-expect-error Approved terrain modules remain JavaScript.
import { WATER_LEVEL } from '../terrainStudy/surface.js';
import { VIEW3D } from './lookData';
import { VTEST_UNIFORMS } from './visualTestLook';

const MIRROR = VIEW3D.visualTest.coast.open.mirror;
const LEVEL = WATER_LEVEL as number;

export class SeaMirror {
  private readonly target = new WebGLRenderTarget(4, 4, { type: HalfFloatType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: true });
  private readonly camera = new OrthographicCamera();
  /** Keeps everything at or under the water out of the mirror's picture, the water itself included. */
  private readonly above = new Plane(new Vector3(0, 1, 0), -(LEVEL + .006));
  private readonly size = new Vector2();
  private readonly position = new Vector3();
  private readonly ahead = new Vector3();
  private readonly up = new Vector3();
  private readonly bias = new Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
  /** Each material drawn in the mirror, and its twin. See the module docblock. */
  private readonly twins = new Map<Material, { twin: Material; release: () => void }>();
  /** The objects whose material the pass swapped, and the material each had. */
  private readonly swapped: { object: { material: Material }; material: Material }[] = [];
  /** How many twins have been made since the page loaded, for tests and the cost report. */
  twinsMade = 0;

  /**
   * The material's twin: an object whose prototype is the material. Reads go
   * to the material, so the twin always has its colour, textures, uniforms,
   * shader hooks, cache key, version and id (the id keeps three's sort order).
   * three keys its own record of a material (the program, the uniform list) on
   * the object, so the twin's record is its own. The twin gets its own event
   * listeners, so three's dispose hook for it lands on it, and it is disposed
   * with its material.
   */
  private twinOf(material: Material): Material {
    const kept = this.twins.get(material);
    if (kept) return kept.twin;
    const twin = Object.create(material) as Material;
    (twin as unknown as { _listeners: object })._listeners = {};
    const release = (): void => {
      material.removeEventListener('dispose', release);
      if (this.twins.get(material)?.twin === twin) this.twins.delete(material);
      twin.dispose();
    };
    material.addEventListener('dispose', release);
    this.twins.set(material, { twin, release });
    this.twinsMade++;
    return twin;
  }

  /**
   * Draws every visible object of the scene with its material's twin, for the
   * mirror pass. Only an object with one material is swapped; one with a list
   * keeps it and changes program as before.
   */
  private swapIn(scene: Scene): void {
    const visit = (object: Object3D): void => {
      if (!object.visible) return;
      const holder = object as Object3D & { material?: Material | Material[] };
      const material = holder.material;
      if (material && !Array.isArray(material) && (material as { isMaterial?: boolean }).isMaterial) {
        this.swapped.push({ object: holder as { material: Material }, material });
        holder.material = this.twinOf(material);
      }
      for (const child of object.children) visit(child);
    };
    visit(scene);
  }

  /**
   * Puts every material back. three may have written a property onto a twin
   * during the pass (a double-sided transparent material has its side flipped
   * and its version raised for each of its two draws): those writes are taken
   * off again, so the twin reads its material's values on the next frame.
   */
  private swapOut(): void {
    for (const { object, material } of this.swapped) {
      const twin = object.material as unknown as Record<string, unknown>;
      for (const key of Object.keys(twin)) if (key !== '_listeners') delete twin[key];
      object.material = material;
    }
    this.swapped.length = 0;
  }

  /**
   * Draws the mirror's picture for this frame. `hidden` are the layers that
   * are marks on the board and not things in the world: borders, lenses,
   * rings, the fog's paper. They do not reflect. `aimed` is called with the
   * mirror's camera just before the draw. `shadowPass` is true when this draw
   * will also draw a shadow map; then the materials are not swapped for twins.
   */
  render(renderer: WebGLRenderer, scene: Scene, camera: OrthographicCamera, hidden: readonly (Object3D | null | undefined)[],
    { aimed, shadowPass = false }: { aimed?: (mirror: OrthographicCamera) => void; shadowPass?: boolean } = {}): void {
    renderer.getDrawingBufferSize(this.size);
    const width = Math.max(4, Math.round(this.size.x * MIRROR.scale)), height = Math.max(4, Math.round(this.size.y * MIRROR.scale));
    if (this.target.width !== width || this.target.height !== height) this.target.setSize(width, height);

    // The real camera's place, the way it looks and its up, each mirrored in the water's surface.
    camera.updateMatrixWorld();
    this.position.setFromMatrixPosition(camera.matrixWorld);
    camera.getWorldDirection(this.ahead);
    this.up.set(0, 1, 0).transformDirection(camera.matrixWorld);
    const mirror = this.camera;
    mirror.left = camera.left; mirror.right = camera.right; mirror.top = camera.top; mirror.bottom = camera.bottom;
    mirror.near = camera.near; mirror.far = camera.far; mirror.zoom = camera.zoom;
    mirror.layers.mask = camera.layers.mask;
    mirror.position.set(this.position.x, 2 * LEVEL - this.position.y, this.position.z);
    mirror.up.set(this.up.x, -this.up.y, this.up.z);
    mirror.lookAt(this.position.x + this.ahead.x, 2 * LEVEL - this.position.y - this.ahead.y, this.position.z + this.ahead.z);
    mirror.updateProjectionMatrix();
    mirror.updateMatrixWorld();
    // From a point in the world to its place in the mirror's picture.
    VTEST_UNIFORMS.vtestMirrorMatrix.value.copy(this.bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);

    const shown = hidden.filter((layer): layer is Object3D => !!layer && layer.visible);
    for (const layer of shown) layer.visible = false;
    const background = scene.background, planes = renderer.clippingPlanes, previous = renderer.getRenderTarget();
    const alpha = renderer.getClearAlpha();
    // The water must not read the picture while it is being drawn.
    VTEST_UNIFORMS.vtestMirrorOn.value = 0;
    scene.background = null;
    renderer.clippingPlanes = [this.above];
    renderer.setRenderTarget(this.target);
    renderer.setClearAlpha(0);
    renderer.clear();
    // The caller's last word on what this camera draws (the wrap copies it cannot see). See `copyCulling.ts`.
    aimed?.(mirror);
    // A pass that also draws a shadow map keeps the materials themselves: the bake teaches each receiving
    // material its shadow lookup (`paintedShadowWrap.js`), and it must teach the material, not a twin.
    if (!shadowPass) this.swapIn(scene);
    try {
      renderer.render(scene, mirror);
    } finally {
      this.swapOut();
    }
    renderer.setClearAlpha(alpha);
    renderer.setRenderTarget(previous);
    renderer.clippingPlanes = planes;
    scene.background = background;
    for (const layer of shown) layer.visible = true;
    VTEST_UNIFORMS.vtestMirrorMap.value = this.target.texture;
    VTEST_UNIFORMS.vtestMirrorOn.value = 1;
  }

  /** Stops the water reading the picture, for a frame that did not draw one. */
  off(): void { VTEST_UNIFORMS.vtestMirrorOn.value = 0; }

  dispose(): void {
    this.off(); this.target.dispose();
    for (const { release } of [...this.twins.values()]) release();
    this.twins.clear();
  }
}
