/**
 * Camera over the world plane.
 *
 * World units are "base-scale pixels": the same space the cached terrain canvas
 * is drawn in (1 world unit = 1 cached pixel). `x`/`y` are the world point under
 * the centre of the viewport; `zoom` scales world -> screen.
 *
 * That space is the *isometric* one — the hex plane already squashed vertically
 * by `projection.ts`. The camera is deliberately unaware of this: the squash
 * never touches x, so the wrap period and every formula below are the same as
 * they were for the flat top-down view.
 *
 * The world is a cylinder: `x` wraps modulo `worldWidth`, `y` is clamped so the
 * map cannot be dragged off the top or bottom.
 */

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface WorldBounds {
  worldWidth: number;
  worldHeight: number;
}

export interface Viewport {
  width: number;
  height: number;
}

// Low enough that even a huge map fits the viewport height when framed.
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.5;

export function createCamera(bounds: WorldBounds, zoom = 1): Camera {
  return { x: bounds.worldWidth / 2, y: bounds.worldHeight / 2, zoom };
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Wraps x, clamps y and zoom. Call after any camera mutation. */
export function normalizeCamera(
  camera: Camera,
  bounds: WorldBounds,
  viewport: Viewport,
): void {
  camera.zoom = clampZoom(camera.zoom);

  const w = bounds.worldWidth;
  camera.x = ((camera.x % w) + w) % w;

  const halfViewHeight = viewport.height / 2 / camera.zoom;
  if (halfViewHeight * 2 >= bounds.worldHeight) {
    camera.y = bounds.worldHeight / 2;
  } else {
    camera.y = Math.min(
      bounds.worldHeight - halfViewHeight,
      Math.max(halfViewHeight, camera.y),
    );
  }
}

export function worldToScreen(
  camera: Camera,
  viewport: Viewport,
  worldX: number,
  worldY: number,
): { x: number; y: number } {
  return {
    x: (worldX - camera.x) * camera.zoom + viewport.width / 2,
    y: (worldY - camera.y) * camera.zoom + viewport.height / 2,
  };
}

export function screenToWorld(
  camera: Camera,
  viewport: Viewport,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  return {
    x: (screenX - viewport.width / 2) / camera.zoom + camera.x,
    y: (screenY - viewport.height / 2) / camera.zoom + camera.y,
  };
}

/** Zooms by `factor`, keeping the world point under `(screenX, screenY)` fixed. */
export function zoomAt(
  camera: Camera,
  bounds: WorldBounds,
  viewport: Viewport,
  factor: number,
  screenX: number,
  screenY: number,
): void {
  const before = screenToWorld(camera, viewport, screenX, screenY);
  camera.zoom = clampZoom(camera.zoom * factor);
  const after = screenToWorld(camera, viewport, screenX, screenY);
  camera.x += before.x - after.x;
  camera.y += before.y - after.y;
  normalizeCamera(camera, bounds, viewport);
}

/** The world-space rectangle currently visible (x may be outside [0, worldWidth)). */
export function visibleWorldRect(
  camera: Camera,
  viewport: Viewport,
): { left: number; right: number; top: number; bottom: number } {
  const halfW = viewport.width / 2 / camera.zoom;
  const halfH = viewport.height / 2 / camera.zoom;
  return {
    left: camera.x - halfW,
    right: camera.x + halfW,
    top: camera.y - halfH,
    bottom: camera.y + halfH,
  };
}
