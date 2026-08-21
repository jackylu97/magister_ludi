/**
 * A fixed-angle orthographic camera that pans and zooms and nothing else.
 *
 * Orthographic, not perspective, on purpose: the tabletop read depends on
 * every tile being the same size wherever it sits on screen. Under perspective
 * the far edge of the board shrinks and the scene stops looking like an object
 * you could pick up and starts looking like a landscape you are standing in.
 *
 * The angle is fixed for the same reason Civ fixes it — at 57° the hex tops
 * stay readable while the prism sides still show enough face to carry the
 * lighting, and an orbit control would let the player find the two or three
 * angles where a low-poly board falls apart.
 *
 * Pan maths
 * ---------
 * Dragging must move the *ground* under the cursor by the number of pixels the
 * cursor moved, in both axes. Horizontally that is free — the camera's right
 * vector is horizontal, so one world unit is one screen unit. Vertically it is
 * not: a horizontal world displacement toward the horizon only climbs the
 * screen by `sin(elevation)` of its length, so the vertical drag term is
 * divided by `sin(elevation)` to compensate. Without that correction the board
 * lags the cursor and the drag feels greasy.
 */

import { OrthographicCamera, Vector3 } from 'three';

import { CAMERA } from './palette';

const DEG = Math.PI / 180;
/** Ortho, so this only has to be far enough not to clip the board. */
const EYE_DISTANCE = 240;

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class DioramaCamera {
  readonly camera: OrthographicCamera;
  readonly target = new Vector3();

  /** Half-height of the frustum in world units. Smaller is more zoomed in. */
  private frustum: number = CAMERA.frustum;
  private aspect = 1;
  private viewportHeight = 1;

  /** Unit vector from target toward the eye. Constant — the angle never changes. */
  private readonly eyeDirection: Vector3;
  /** Ground-plane direction the camera looks along; the vertical drag axis. */
  private readonly groundForward: Vector3;
  /** Camera right, which is horizontal; the horizontal drag axis. */
  private readonly right: Vector3;
  private readonly sinElevation: number;

  private bounds: Bounds | null = null;

  constructor() {
    const el = CAMERA.elevation * DEG;
    const az = CAMERA.azimuth * DEG;
    this.eyeDirection = new Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    ).normalize();
    this.groundForward = new Vector3(-Math.cos(az), 0, -Math.sin(az)).normalize();
    this.right = new Vector3(Math.sin(az), 0, -Math.cos(az)).normalize();
    this.sinElevation = Math.sin(el);

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 1, EYE_DISTANCE * 2.5);
    this.apply();
  }

  /** Frustum half-height, exposed so the shadow camera can match the zoom. */
  get radius(): number {
    return this.frustum;
  }

  resize(width: number, height: number): void {
    this.aspect = width / Math.max(1, height);
    this.viewportHeight = Math.max(1, height);
    this.apply();
  }

  /** Clamps panning so the board can never be dragged entirely off screen. */
  setBounds(bounds: Bounds | null): void {
    this.bounds = bounds;
    this.clamp();
    this.apply();
  }

  lookAtPoint(point: Vector3): void {
    this.target.set(point.x, 0, point.z);
    this.clamp();
    this.apply();
  }

  /** `dx`/`dy` are pointer deltas in CSS pixels, screen-space (y down). */
  pan(dx: number, dy: number): void {
    const worldPerPixel = (this.frustum * 2) / this.viewportHeight;
    this.target.addScaledVector(this.right, -dx * worldPerPixel);
    this.target.addScaledVector(this.groundForward, (dy * worldPerPixel) / this.sinElevation);
    this.clamp();
    this.apply();
  }

  /** `delta` is a wheel delta; positive zooms out. Exponential, so it feels even. */
  zoom(delta: number): void {
    const next = this.frustum * Math.exp(delta * 0.0016);
    this.frustum = Math.min(CAMERA.maxFrustum, Math.max(CAMERA.minFrustum, next));
    this.apply();
  }

  /** Back to the default zoom. Used when a new board of a new size arrives. */
  resetZoom(): void {
    this.frustum = CAMERA.frustum;
    this.apply();
  }

  private clamp(): void {
    if (!this.bounds) return;
    const pad = this.frustum * 0.5;
    this.target.x = Math.min(
      this.bounds.maxX + pad,
      Math.max(this.bounds.minX - pad, this.target.x),
    );
    this.target.z = Math.min(
      this.bounds.maxZ + pad,
      Math.max(this.bounds.minZ - pad, this.target.z),
    );
  }

  private apply(): void {
    const half = this.frustum;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.left = -half * this.aspect;
    this.camera.right = half * this.aspect;
    this.camera.near = 1;
    this.camera.far = EYE_DISTANCE * 2.5;
    this.camera.position.copy(this.target).addScaledVector(this.eyeDirection, EYE_DISTANCE);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
  }
}
