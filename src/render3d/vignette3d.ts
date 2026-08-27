/**
 * The city screen's vignette: while a city panel is open, everything away from
 * that city's work radius is washed down so the framed town and its ring read
 * as the subject.
 *
 * Why a screen-space quad rather than a ring on the ground
 * -------------------------------------------------------
 * The obvious build is an annulus decal at the city's cell — a hole the size of
 * the work radius, a dark band around it, drawn `onTop` like every other decal
 * in `overlays.ts`. It is wrong for this job, and the reason is the camera. The
 * diorama is seen down a fixed 57° elevation, so a disc of *ground* is an
 * ellipse on screen, and — worse — everything that stands *above* the ground
 * stands outside its own tile's footprint. A mountain cone, a pine, a piece, the
 * badge floating over it: each leans up-screen into the hexes behind it. A wash
 * anchored to the ground would therefore darken the earth a distant forest grows
 * out of and leave the forest lit, which is the exact opposite of "the far
 * country recedes".
 *
 * So the wash is *screen* space. One quad, drawn last, over the frame the
 * renderer has already composed:
 *
 *   · it composites over **every** layer in one draw — board, props, fog wash,
 *     territory, improvements, pieces, badges, HP bars, decals — because it is
 *     applied after all of them rather than among them;
 *   · it writes **no instance tint and rebuilds nothing**. That is not a
 *     discipline this module keeps, it is a thing it has no way to do: it never
 *     touches the board, the collectors or the fog, and it holds one `Mesh`;
 *   · it **respects fog by construction**. A dark wash over the finished frame
 *     cannot reveal anything — the darkest it can make a hidden hex is darker.
 *     There is no path from here to `hide`/`restore`, `suppress` or `veil`.
 *
 * The vertex shader writes clip space straight from the quad's own coordinates
 * and never reads a camera matrix, so the quad is the viewport whatever the
 * camera is doing; `frustumCulled` is off for the same reason (its bounding
 * sphere means nothing).
 *
 * The hole is an **ellipse**, not a circle, and that is the part that makes it
 * look anchored: its semi-axes are the *projected* length of one work radius of
 * ground along the camera's right and along the ground direction that climbs the
 * screen. The renderer measures both by projecting two points beside the city
 * through its own `projectPoint` — the one place this codebase turns world into
 * screen — so the ellipse tracks zoom, pan and the seam wrap for free, and there
 * is no second copy of the elevation foreshortening to drift.
 *
 * The falloff is `smoothstep` between `innerRadius` and `outerRadius`, both in
 * units of that projected radius: 1.0 is exactly the edge of the work radius.
 *
 * Fading
 * ------
 * `setFocus` starts a tween on one number, sampled by `step(now)` exactly as the
 * camera's pan is sampled by `stepPan` — data, not a scheduler. Nothing here
 * calls `performance.now()` or `requestAnimationFrame`; the renderer keeps
 * owning the clock, and `step` returning true is what tells the render-on-demand
 * loop it still owes frames. `animate: false` — reduced motion, or a seat change
 * that took the panel with it — lands on the destination immediately, which is
 * the same contract `frameCells` has.
 */

import { Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from 'three';

import { RENDER_ORDER } from './instances';
import { VIEW3D } from './lookData';
import type { CellRef } from './overlays';

const VIGNETTE = VIEW3D.vignette;

/** Hex centre-to-centre spacing is `√3 · hexRadius`; see `layout.ts`. */
const SQRT3 = Math.sqrt(3);

/** A projected point, in viewport CSS pixels. */
export interface ScreenXY {
  x: number;
  y: number;
}

/**
 * Where the hole is and how big it is, in viewport pixels: the city's projected
 * centre, and the projected semi-axes of one work radius of ground.
 */
export interface FocusAnchor {
  x: number;
  y: number;
  semiX: number;
  semiY: number;
}

/**
 * How far one work radius of ground reaches, in world units.
 *
 * `rings` centre-to-centre steps out to the middle of the outermost ring, plus
 * one hex radius to reach that ring's far edge — the wash must clear the tiles
 * the city can actually work, not bisect them.
 */
export function workRadiusWorld(rings: number, hexRadius: number): number {
  return SQRT3 * hexRadius * rings + hexRadius;
}

/**
 * The ellipse, from three projected points: the city, and the city offset by one
 * work radius along the camera's right and along the ground direction that
 * climbs the screen.
 *
 * Both axes are floored at one pixel. A zero axis is a division by zero in the
 * shader, and it is reachable — a camera looking straight down would flatten the
 * climb axis to nothing — so the floor is the guard rather than a caller's
 * assertion.
 */
export function focusAnchor(centre: ScreenXY, along: ScreenXY, up: ScreenXY): FocusAnchor {
  return {
    x: centre.x,
    y: centre.y,
    semiX: Math.max(1, Math.hypot(along.x - centre.x, along.y - centre.y)),
    semiY: Math.max(1, Math.hypot(up.x - centre.x, up.y - centre.y)),
  };
}

/**
 * The wash's shoulder: 0 inside `inner`, 1 beyond `outer`, `smoothstep` between.
 *
 * The same curve the fragment shader runs, written once here so a test can hold
 * the shape without a GL context. A degenerate band (outer at or inside inner)
 * is a hard edge rather than a NaN.
 */
export function focusFalloff(radius: number, inner: number, outer: number): number {
  if (outer <= inner) return radius >= outer ? 1 : 0;
  const t = Math.min(1, Math.max(0, (radius - inner) / (outer - inner)));
  return t * t * (3 - 2 * t);
}

/**
 * How dark one pixel comes out, given the anchor and how far the fade has got.
 *
 * The CPU twin of the fragment shader, and the reason the geometry is testable
 * at all: the shader is the same three lines against the same uniforms.
 */
export function focusAlphaAt(
  px: number,
  py: number,
  anchor: FocusAnchor,
  fade: number,
  inner: number = VIGNETTE.innerRadius,
  outer: number = VIGNETTE.outerRadius,
  opacity: number = VIGNETTE.opacity,
): number {
  const dx = (px - anchor.x) / anchor.semiX;
  const dy = (py - anchor.y) / anchor.semiY;
  return focusFalloff(Math.hypot(dx, dy), inner, outer) * opacity * fade;
}

/**
 * A fade in flight, sampled absolutely rather than accumulated — `PanTween`'s
 * rule, one number wide: the endpoints and the start time are what is stored, so
 * a dropped frame cannot leave the wash short of where it belongs.
 */
export function fadeAt(from: number, to: number, elapsedMs: number, fadeMs: number): number {
  if (fadeMs <= 0 || elapsedMs >= fadeMs) return to;
  if (elapsedMs <= 0) return from;
  const t = elapsedMs / fadeMs;
  return from + (to - from) * (t * t * (3 - 2 * t));
}

/**
 * Clip space straight from the quad's own coordinates, and the same coordinates
 * handed on as a varying.
 *
 * The varying rather than `gl_FragCoord` is the load-bearing choice. The anchor
 * arrives in **viewport CSS pixels**, because that is what `projectPoint`
 * speaks; `gl_FragCoord` is in *framebuffer* pixels and its origin is at the
 * bottom, so reading it would mean carrying the device pixel ratio and a flip
 * into this shader and keeping both in step with however the canvas is measured.
 * Interpolating clip space instead lets the fragment redo exactly the
 * NDC-to-pixel conversion `projectPoint` does, from one uniform nobody can get
 * out of date.
 */
const VERTEX = `
varying vec2 vClip;

void main() {
  vClip = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * The shoulder, spelled the way `focusFalloff` and `focusAlphaAt` spell it.
 * `smoothstep` is the same cubic; it is written out so the two readings cannot
 * drift on a driver that clamps differently.
 *
 * `uAlpha` arrives already carrying `vignette.opacity` — the fade times the
 * tunable, folded on the CPU. The shader therefore has one number to multiply
 * by and no second place the darkest-it-may-get is decided, which is what makes
 * `focusAlphaAt(…, fade)` the exact twin of this program rather than a near one.
 */
const FRAGMENT = `
varying vec2 vClip;

uniform vec2 uViewport;
uniform vec2 uCentre;
uniform vec2 uAxes;
uniform vec3 uColor;
uniform float uInner;
uniform float uOuter;
uniform float uAlpha;

void main() {
  vec2 px = vec2(vClip.x * 0.5 + 0.5, 0.5 - vClip.y * 0.5) * uViewport;
  vec2 d = (px - uCentre) / uAxes;
  float t = clamp((length(d) - uInner) / max(uOuter - uInner, 1e-4), 0.0, 1.0);
  float shoulder = t * t * (3.0 - 2.0 * t);
  gl_FragColor = vec4(uColor, shoulder * uAlpha);
}
`;

/**
 * The wash, as the renderer holds it: one mesh, one tween, and the cell it is
 * holed for.
 *
 * The cell is the whole of its state. It is set from the UI's own derived answer
 * to "which city is open" (`controls.refreshOverlays`), never from a flag this
 * module keeps, which is what makes every close path — Escape, a click on the
 * board, selecting a unit, a seat change, a new game, a load — clear it without
 * any of them knowing this file exists.
 */
export class CityFocusVignette {
  readonly mesh: Mesh;

  private readonly material: ShaderMaterial;
  private cell: CellRef | null = null;

  /** The tween, in the shape `PanTween` uses: endpoints plus a start time. */
  private from = 0;
  private to = 0;
  private startedAt = 0;
  private durationMs = 0;
  private alpha = 0;

  constructor() {
    this.material = new ShaderMaterial({
      uniforms: {
        uViewport: { value: new Vector2(1, 1) },
        uCentre: { value: new Vector2(0, 0) },
        uAxes: { value: new Vector2(1, 1) },
        uColor: { value: new Vector3(1, 1, 1) },
        uInner: { value: VIGNETTE.innerRadius },
        uOuter: { value: VIGNETTE.outerRadius },
        uAlpha: { value: 0 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const color = VIGNETTE.color;
    (this.material.uniforms.uColor!.value as Vector3).set(
      ((color >> 16) & 0xff) / 255,
      ((color >> 8) & 0xff) / 255,
      (color & 0xff) / 255,
    );

    // Two units on a side is the whole of clip space, which is what the vertex
    // shader writes the quad's own coordinates into.
    this.mesh = new Mesh(new PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = RENDER_ORDER.vignette;
    this.mesh.visible = false;
  }

  /** The cell the hole is centred on, or `null` when no city screen is open. */
  focus(): CellRef | null {
    return this.cell;
  }

  /** How dark the wash is right now, 0 while it is down. */
  alphaNow(): number {
    return this.alpha;
  }

  /**
   * Points the wash at a city, or takes it away.
   *
   * Idempotent on the cell, because the caller is `refreshOverlays` and that
   * runs on very nearly everything: asking for the city that is already framed
   * must not restart the fade under the player's eyes.
   */
  setFocus(cell: CellRef | null, animate: boolean, now: number): void {
    const same =
      (cell === null && this.cell === null) ||
      (cell !== null &&
        this.cell !== null &&
        cell.col === this.cell.col &&
        cell.row === this.cell.row);
    if (same) return;
    this.cell = cell === null ? null : { col: cell.col, row: cell.row };
    // Always a tween from wherever the wash actually is toward where it belongs,
    // with no special case for one city straight to another: that move's
    // destination is 1 and the wash is already at or heading for 1, so the
    // generic path holds it up and simply slides the hole. A branch for it would
    // exist only to snap, and snapping is the one thing a fade is for avoiding.
    this.from = this.alpha;
    this.to = cell === null ? 0 : 1;
    this.startedAt = now;
    this.durationMs = animate ? Math.max(0, VIGNETTE.fadeMs) : 0;
    if (this.durationMs <= 0) this.alpha = this.to;
  }

  /**
   * Samples the fade. Returns true while it still owes frames — the same
   * contract `DioramaCamera.stepPan` has, and what keeps the render-on-demand
   * loop drawing through a fade and idle after it.
   */
  step(now: number): boolean {
    if (this.durationMs <= 0) return false;
    const elapsed = now - this.startedAt;
    this.alpha = fadeAt(this.from, this.to, elapsed, this.durationMs);
    if (elapsed >= this.durationMs) {
      this.alpha = this.to;
      this.durationMs = 0;
      return false;
    }
    return true;
  }

  /**
   * Writes the frame's uniforms. `null` is "there is nothing to hole this
   * around" — no map, no tile — and takes the wash off rather than washing the
   * whole board from a stale centre.
   */
  place(anchor: FocusAnchor | null, viewportWidth: number, viewportHeight: number): void {
    if (!anchor || this.alpha <= 0) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    (this.material.uniforms.uViewport!.value as Vector2).set(
      Math.max(1, viewportWidth),
      Math.max(1, viewportHeight),
    );
    (this.material.uniforms.uCentre!.value as Vector2).set(anchor.x, anchor.y);
    (this.material.uniforms.uAxes!.value as Vector2).set(anchor.semiX, anchor.semiY);
    this.material.uniforms.uAlpha!.value = this.alpha * VIGNETTE.opacity;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
