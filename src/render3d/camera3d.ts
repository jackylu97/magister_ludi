/**
 * A fixed-angle orthographic camera that pans, zooms, and wraps.
 *
 * Orthographic, not perspective, on purpose: the tabletop read depends on every
 * tile being the same size wherever it sits on screen. Under perspective the far
 * edge of the board shrinks and the scene stops looking like an object you could
 * pick up and starts looking like a landscape you are standing in.
 *
 * The angle is fixed for the same reason Civ fixes it — at 57° the hex tops stay
 * readable while the prism sides still show enough face to carry the lighting,
 * and an orbit control would let the player find the two or three angles where a
 * low-poly board falls apart. It is also what makes closed-form picking possible
 * and what lets the HP-bar quads be pre-oriented once instead of billboarded
 * every frame.
 *
 * Pan maths
 * ---------
 * Dragging must move the *ground* under the cursor by the number of pixels the
 * cursor moved, in both axes. Horizontally that is free — the camera's right
 * vector is horizontal, so one world unit is one screen unit. Vertically it is
 * not: a horizontal world displacement toward the horizon only climbs the screen
 * by `sin(elevation)` of its length, so the vertical drag term is divided by
 * `sin(elevation)` to compensate. Without that correction the board lags the
 * cursor and the drag feels greasy.
 *
 * Wrapping
 * --------
 * The board is a cylinder, and the renderer bakes three copies of it side by
 * side (see `board3d.ts`). The camera's target x is therefore wrapped modulo the
 * wrap period exactly as `src/render/camera.ts` wraps its own — pan east past the
 * seam and the target snaps back a whole period while the copy you are looking
 * at is identical, so the seam is invisible. z is clamped instead: rows do not
 * wrap, and the board must not be draggable off the top or bottom.
 *
 * Because the light rig and the shadow frustum both follow `target`, wrapping
 * the target wraps them too, and the shadows stay put across the seam.
 *
 * Animated pans
 * -------------
 * `panTo` moves the target somewhere over a few hundred milliseconds — the "go
 * look at this player" gesture. It is a *tween on data*, not a scheduler: the
 * camera stores where it started, where it is going and when it left, and
 * `stepPan(now)` samples that. Nothing here calls `performance.now()` or
 * `requestAnimationFrame`, exactly as `animation3d.ts` does not, so the renderer
 * keeps owning the clock and the render-on-demand loop keeps drawing frames only
 * while `stepPan` says the camera is still moving.
 *
 * The destination is resolved to the copy of the cylinder nearest the current
 * target before the tween starts, so a pan across the seam takes the short way
 * round instead of unwinding the whole board. Both endpoints are stored
 * un-wrapped and the tween is sampled absolutely (never accumulated), so the
 * modular wrap `normalize` applies to the live target cannot drag it off course.
 *
 * Any hand-driven camera change — a drag, a wheel, a re-frame — cancels an
 * in-flight pan. The player's hand always wins.
 */

import { OrthographicCamera, Vector3 } from 'three';

import { VIEW3D } from './lookData';

const DEG = Math.PI / 180;
const CAMERA = VIEW3D.camera;

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** A world-space ray. `direction` is a unit vector. */
export interface Ray {
  origin: Vector3;
  direction: Vector3;
}

/**
 * A pan in flight. Endpoints are un-wrapped world coordinates in the frame the
 * tween started in; see the module docblock.
 */
interface PanTween {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  /**
   * Optional: the frustum tweens alongside the pan when both are set — see
   * `frameCells`. `panTo` never sets these, so an ordinary pan leaves the zoom
   * exactly where the player put it, which is `panTo`'s own contract.
   */
  fromFrustum?: number;
  toFrustum?: number;
  startedAt: number;
  durationMs: number;
}

/** Slow in, slow out. Steeper in the middle than the walk-cycle ease. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export class DioramaCamera {
  readonly camera: OrthographicCamera;
  readonly target = new Vector3();

  /** Half-height of the frustum in world units. Smaller is more zoomed in. */
  private frustum: number = CAMERA.frustum;
  private aspect = 1;
  private viewportWidth = 1;
  private viewportHeight = 1;

  /** Unit vector from target toward the eye. Constant — the angle never changes. */
  readonly eyeDirection: Vector3;
  /** Ground-plane direction the camera looks along; the vertical drag axis. */
  private readonly groundForward: Vector3;
  /** Camera right, which is horizontal; the horizontal drag axis. */
  private readonly right: Vector3;
  private readonly sinElevation: number;

  private bounds: Bounds | null = null;
  /** Horizontal wrap period in world units; 0 means "do not wrap". */
  private wrapPeriod = 0;
  /** Raised by `frameBoard` so a whole map can always be zoomed out to. */
  private maxFrustum = CAMERA.maxFrustum;
  /** The pan currently animating, or null. See the module docblock. */
  private panTween: PanTween | null = null;

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

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 1, CAMERA.eyeDistance * 2.5);
    this.apply();
  }

  /** Frustum half-height, exposed so the shadow camera can match the zoom. */
  get radius(): number {
    return this.frustum;
  }

  resize(width: number, height: number): void {
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    this.aspect = this.viewportWidth / this.viewportHeight;
    this.apply();
  }

  /**
   * Tells the camera about the board it is looking at: how far it may roam in z,
   * and the period it wraps in x. A `wrapPeriod` of 0 disables wrapping and falls
   * back to clamping, which is what an un-wrapped board would want.
   */
  setBoard(bounds: Bounds | null, wrapPeriod: number): void {
    this.bounds = bounds;
    this.wrapPeriod = wrapPeriod;
    this.cancelPan();
    this.normalize();
    this.apply();
  }

  lookAtPoint(point: Vector3): void {
    this.cancelPan();
    this.target.set(point.x, 0, point.z);
    this.normalize();
    this.apply();
  }

  /** `dx`/`dy` are pointer deltas in CSS pixels, screen-space (y down). */
  pan(dx: number, dy: number): void {
    this.cancelPan();
    const worldPerPixel = (this.frustum * 2) / this.viewportHeight;
    this.target.addScaledVector(this.right, -dx * worldPerPixel);
    this.target.addScaledVector(this.groundForward, (dy * worldPerPixel) / this.sinElevation);
    this.normalize();
    this.apply();
  }

  /**
   * Zooms by a multiplier (> 1 zooms in), keeping the ground point under
   * `(screenX, screenY)` fixed — the same "zoom where you point" contract the 2D
   * camera offers, and the same units, so `controls.ts` can drive either
   * renderer with one wheel handler.
   *
   * A larger frustum shows more board, so the factor divides rather than
   * multiplies.
   */
  zoomByFactor(factor: number, screenX: number, screenY: number): void {
    this.cancelPan();
    const before = this.groundAt(screenX, screenY);
    const next = this.frustum / factor;
    this.frustum = Math.min(this.maxFrustum, Math.max(CAMERA.minFrustum, next));
    this.apply();
    const after = this.groundAt(screenX, screenY);
    this.target.x += before.x - after.x;
    this.target.z += before.z - after.z;
    this.normalize();
    this.apply();
  }

  /**
   * The frustum a rectangle of ground needs to fit on screen, with the
   * standard fit padding — shared by `frameBoard` and `frameCells`.
   *
   * The rectangle is seen from an oblique fixed angle, so "how much frustum
   * does it need" is not a formula: the corners are pushed through the
   * camera's own view matrix and the extremes are read back. That means the
   * camera must already be pointed at the rectangle's centre — `target` set
   * and `apply()` called — before this is asked; both callers do that first.
   */
  private neededFrustumFor(bounds: Bounds): number {
    const corner = new Vector3();
    let halfWidth = 0;
    let halfHeight = 0;
    for (const x of [bounds.minX, bounds.maxX]) {
      for (const z of [bounds.minZ, bounds.maxZ]) {
        corner.set(x, 0, z).applyMatrix4(this.camera.matrixWorldInverse);
        halfWidth = Math.max(halfWidth, Math.abs(corner.x));
        halfHeight = Math.max(halfHeight, Math.abs(corner.y));
      }
    }
    return Math.max(halfHeight, halfWidth / this.aspect) * CAMERA.fitPadding + VIEW3D.board.hexRadius;
  }

  /**
   * Frames a whole board: centres on it and picks the zoom that shows all of it.
   *
   * The frustum ceiling is raised to whatever this needs, so a giant map can
   * always be zoomed out far enough to be seen whole.
   */
  frameBoard(bounds: Bounds): void {
    this.cancelPan();
    this.target.set((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
    this.apply();

    const needed = this.neededFrustumFor(bounds);
    this.maxFrustum = Math.max(CAMERA.maxFrustum, needed);
    this.frustum = Math.min(this.maxFrustum, Math.max(CAMERA.minFrustum, needed));
    this.normalize();
    this.apply();
  }

  /**
   * Frames a rectangle of ground — pan and zoom together — for "show me this
   * city's work radius", the gesture opening a city panel makes.
   *
   * Unlike `frameBoard`, the zoom-out ceiling never rises: this is asked for
   * a handful of tiles, not a map, and letting the diorama zoom out past its
   * usual band for one would look like the camera lurched rather than framed.
   *
   * The target lands `camera.cityFrameBiasPx` screen pixels right of the
   * rectangle's true centre. Because the camera looks straight down the
   * middle of the whole canvas — panel included — that draws the framed
   * tiles that many pixels *left* of screen centre, which is roughly half the
   * fixed-width city panel's footprint (see `style.css`'s `#city-panel`), so
   * tiles that would otherwise land dead centre come out clear of it. A fixed
   * pixel bias rather than a fraction of the frustum, because the panel is a
   * fixed CSS width regardless of zoom, so the bias has to be too.
   *
   * `animate` glides the pan and the zoom together over `camera.panMs`,
   * sampled by the same `stepPan` an ordinary pan uses (see `PanTween`'s
   * optional frustum fields); false jumps straight there.
   */
  frameCells(bounds: Bounds, animate: boolean, now: number): void {
    const fromX = this.target.x;
    const fromZ = this.target.z;
    const fromFrustum = this.frustum;

    const toX = (bounds.minX + bounds.maxX) / 2;
    const toZ = (bounds.minZ + bounds.maxZ) / 2;
    this.target.set(toX, 0, toZ);
    this.apply();
    const needed = this.neededFrustumFor(bounds);
    const toFrustum = Math.min(this.maxFrustum, Math.max(CAMERA.minFrustum, needed));

    const worldPerPixel = (toFrustum * 2) / this.viewportHeight;
    const bias = CAMERA.cityFrameBiasPx * worldPerPixel;
    const biasedX = toX + this.right.x * bias;
    const biasedZ = toZ + this.right.z * bias;

    if (!animate || CAMERA.panMs <= 0) {
      this.cancelPan();
      this.target.set(biasedX, 0, biasedZ);
      this.frustum = toFrustum;
      this.normalize();
      this.apply();
      return;
    }

    // Restore the starting point: the fit above had to point the camera at
    // the destination to measure it, but the tween owns the target from here
    // and must start from where the player actually was.
    this.target.set(fromX, 0, fromZ);
    this.frustum = fromFrustum;
    this.apply();

    this.panTween = {
      fromX,
      fromZ,
      toX: biasedX,
      toZ: biasedZ,
      fromFrustum,
      toFrustum,
      startedAt: now,
      durationMs: CAMERA.panMs,
    };
  }

  /** Back to the default zoom, keeping the target where it is. */
  resetZoom(): void {
    this.frustum = Math.min(this.maxFrustum, CAMERA.frustum);
    this.apply();
  }

  // --- animated pan ---------------------------------------------------------

  /**
   * Moves the pan target to a ground point, optionally over `camera.panMs`.
   *
   * The zoom is left exactly where the player put it: this frames a *place*, not
   * a bounding box, and yanking the zoom around under someone who has settled on
   * one is the fastest way to make a camera feel possessed.
   *
   * `animate` false jumps immediately, and so does a distance under
   * `camera.panSnapDistance` — the caller passes false for "prefers reduced
   * motion" and for the opening view of a new game.
   */
  panTo(x: number, z: number, animate: boolean, now: number): void {
    const toX = this.nearestCopyX(x);
    const distance = Math.hypot(toX - this.target.x, z - this.target.z);
    if (!animate || CAMERA.panMs <= 0 || distance < CAMERA.panSnapDistance) {
      this.cancelPan();
      this.target.set(toX, 0, z);
      this.normalize();
      this.apply();
      return;
    }
    this.panTween = {
      fromX: this.target.x,
      fromZ: this.target.z,
      toX,
      toZ: z,
      startedAt: now,
      durationMs: CAMERA.panMs,
    };
  }

  /** True while a pan is animating, so the renderer can keep its loop awake. */
  get isPanning(): boolean {
    return this.panTween !== null;
  }

  /**
   * Advances an in-flight pan to `now`. Returns true on any frame it moved the
   * camera — including the final one, which lands the target exactly on the
   * destination rather than wherever the last sample fell.
   */
  stepPan(now: number): boolean {
    const tween = this.panTween;
    if (!tween) return false;

    const elapsed = now - tween.startedAt;
    const t = tween.durationMs <= 0 ? 1 : elapsed / tween.durationMs;
    if (t >= 1) {
      this.panTween = null;
      this.target.set(tween.toX, 0, tween.toZ);
      if (tween.toFrustum !== undefined) this.frustum = tween.toFrustum;
    } else {
      const k = easeInOutCubic(Math.max(0, t));
      this.target.set(
        tween.fromX + (tween.toX - tween.fromX) * k,
        0,
        tween.fromZ + (tween.toZ - tween.fromZ) * k,
      );
      if (tween.fromFrustum !== undefined && tween.toFrustum !== undefined) {
        this.frustum = tween.fromFrustum + (tween.toFrustum - tween.fromFrustum) * k;
      }
    }
    this.normalize();
    this.apply();
    return true;
  }

  /** Drops any pan in flight, leaving the target wherever it had got to. */
  cancelPan(): void {
    this.panTween = null;
  }

  /**
   * The copy of `x` nearest the current target, on a wrapped board.
   *
   * Without this a pan from just west of the seam to just east of it would
   * travel the whole width of the map to arrive at the tile next door.
   */
  private nearestCopyX(x: number): number {
    const w = this.wrapPeriod;
    if (w <= 0) return x;
    let delta = (((x - this.target.x) % w) + w) % w;
    if (delta > w / 2) delta -= w;
    return this.target.x + delta;
  }

  // --- unprojection --------------------------------------------------------

  /**
   * The world ray under a viewport position, in CSS pixels from the top-left.
   *
   * For an orthographic camera every ray shares the eye direction, so this is an
   * origin problem only: unproject the point on the near plane and shoot
   * backwards along the view axis.
   */
  screenRay(screenX: number, screenY: number): Ray {
    const origin = new Vector3(
      (screenX / this.viewportWidth) * 2 - 1,
      -((screenY / this.viewportHeight) * 2 - 1),
      -1,
    ).unproject(this.camera);
    return { origin, direction: this.eyeDirection.clone().negate() };
  }

  /** Where the ray under a viewport position crosses a horizontal plane. */
  groundAt(screenX: number, screenY: number, planeY = 0): Vector3 {
    const ray = this.screenRay(screenX, screenY);
    return rayPlaneHit(ray, planeY);
  }

  // --- internals -----------------------------------------------------------

  /** Wraps x modulo the board period; clamps z inside the board. */
  private normalize(): void {
    if (this.wrapPeriod > 0) {
      const w = this.wrapPeriod;
      this.target.x = ((this.target.x % w) + w) % w;
    } else if (this.bounds) {
      const pad = this.frustum * 0.5;
      this.target.x = Math.min(
        this.bounds.maxX + pad,
        Math.max(this.bounds.minX - pad, this.target.x),
      );
    }
    if (this.bounds) {
      const pad = this.frustum * 0.5;
      this.target.z = Math.min(
        this.bounds.maxZ + pad,
        Math.max(this.bounds.minZ - pad, this.target.z),
      );
    }
  }

  private apply(): void {
    const half = this.frustum;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.left = -half * this.aspect;
    this.camera.right = half * this.aspect;
    this.camera.near = 1;
    this.camera.far = CAMERA.eyeDistance * 2.5;
    this.camera.position.copy(this.target).addScaledVector(this.eyeDirection, CAMERA.eyeDistance);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
  }
}

/**
 * Where a ray crosses the horizontal plane `y = planeY`.
 *
 * The camera never looks along the horizon (its elevation is a fixed 57°), so
 * the denominator is never near zero and this needs no degenerate case.
 */
export function rayPlaneHit(ray: Ray, planeY: number): Vector3 {
  const t = (planeY - ray.origin.y) / ray.direction.y;
  return ray.origin.clone().addScaledVector(ray.direction, t);
}
