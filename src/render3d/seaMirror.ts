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
 */

import {
  HalfFloatType, LinearFilter, Matrix4, type Object3D, OrthographicCamera, Plane, type Scene, Vector2, Vector3,
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

  /**
   * Draws the mirror's picture for this frame. `hidden` are the layers that
   * are marks on the board and not things in the world: borders, lenses,
   * rings, the fog's paper. They do not reflect.
   */
  render(renderer: WebGLRenderer, scene: Scene, camera: OrthographicCamera, hidden: readonly (Object3D | null | undefined)[]): void {
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
    renderer.render(scene, mirror);
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

  dispose(): void { this.off(); this.target.dispose(); }
}
