/**
 * How the game's WebGL canvas is created and sized, kept apart from the
 * renderer so the page can ask these questions before three.js has loaded.
 *
 * Nothing here imports three.js. `main.ts` uses `probeGraphics` to choose a
 * renderer before it downloads one, and the tests run these functions without a
 * GPU.
 */

/**
 * The context attributes for the game canvas.
 *
 * The painted look never draws the scene to the canvas. It renders into the
 * composer's own half-float targets (which carry their own depth and stencil)
 * and only the final full-screen pass lands on the canvas: one quad, with no
 * edges for multisampling to smooth and no use for a depth or stencil buffer.
 * Asking for them anyway cost a multisampled colour buffer plus a
 * depth-stencil buffer the size of the window, and a resolve every frame
 * (WebGL audit 2026-10-06, finding 7). The toon fallback does draw the scene
 * straight to the canvas, so it keeps all three.
 */
export function canvasAttributes(painted: boolean): { antialias: boolean; depth: boolean; stencil: boolean } {
  return painted
    ? { antialias: false, depth: false, stencil: false }
    : { antialias: true, depth: true, stencil: true };
}

/**
 * The drawing-buffer pixel ratio for a canvas of this CSS size.
 *
 * The device ratio, capped at `maxRatio`, and then lowered further if the
 * buffer would hold more than `pixelBudget` pixels. The cap alone protects a
 * Retina laptop but not a 4K monitor at 100% scaling, which has a ratio of 1 and
 * still asks for 8.3 million pixels: the composer's targets, the contact pass
 * and the fill cost all scale with that (finding 8). Never above the device
 * ratio, so a small window is not supersampled.
 */
export function drawingBufferRatio(
  cssWidth: number,
  cssHeight: number,
  deviceRatio: number,
  maxRatio: number,
  pixelBudget: number,
): number {
  const ratio = Math.min(deviceRatio > 0 ? deviceRatio : 1, maxRatio);
  const area = Math.max(1, cssWidth) * Math.max(1, cssHeight);
  if (!(pixelBudget > 0) || area * ratio * ratio <= pixelBudget) return ratio;
  return Math.sqrt(pixelBudget / area);
}

/**
 * Calls `onChange` once the next time the device pixel ratio changes, for
 * example when the window is dragged to a monitor with a different scale.
 *
 * A `resize` event does not always fire for that move, so the canvas could stay
 * at the old ratio until the next real resize. A `(resolution: Ndppx)` media
 * query matches only the current ratio, so it reports a change exactly once;
 * the caller re-arms it from its own resize. Returns the function that removes
 * the listener, or a no-op where `matchMedia` is missing.
 */
export function watchPixelRatio(ratio: number, onChange: () => void): () => void {
  const query = typeof globalThis.matchMedia === 'function'
    ? globalThis.matchMedia(`(resolution: ${ratio}dppx)`)
    : null;
  if (!query) return () => undefined;
  const listener = (): void => onChange();
  query.addEventListener('change', listener, { once: true });
  return () => query.removeEventListener('change', listener);
}

/** What this browser's WebGL can do, asked before a renderer is built. */
export interface GraphicsSupport {
  /** A WebGL2 context could be created at all. three.js r185 needs one. */
  webgl2: boolean;
  /**
   * Half-float render targets are usable. The painted look renders into
   * half-float targets (the composer, the contact pass, the sky light), and
   * without `EXT_color_buffer_float` or `EXT_color_buffer_half_float` those
   * framebuffers are incomplete and the canvas stays black with no message.
   */
  floatTargets: boolean;
}

/**
 * Probes WebGL on a throwaway canvas and releases the context straight after,
 * so the probe does not count against the browser's limit on live contexts.
 */
export function probeGraphics(createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')): GraphicsSupport {
  let gl: WebGL2RenderingContext | null = null;
  try { gl = createCanvas().getContext('webgl2'); } catch { gl = null; }
  if (!gl) return { webgl2: false, floatTargets: false };
  const floatTargets = gl.getExtension('EXT_color_buffer_float') !== null
    || gl.getExtension('EXT_color_buffer_half_float') !== null;
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return { webgl2: true, floatTargets };
}
