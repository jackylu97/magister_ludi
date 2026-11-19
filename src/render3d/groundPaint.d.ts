import type { BufferGeometry, Material, Mesh, MeshStandardMaterial, Texture, Vector4, WebGLRenderer } from 'three';

/** The texture's box on the map, in world units: one wrap period in x, every row with a hex's reach in z. */
export interface GroundPaintBox { x0: number; period: number; z0: number; z1: number; depth: number }

/**
 * `groundPaintPlan`'s answer: what the plain land of one map can be on one
 * GPU. Plain data, so it travels to the board workers in their message.
 */
export interface GroundPaintPlan extends GroundPaintBox {
  /** The dev trial can switch the base material to a close view across the wrap seam. */
  closeTrial?: boolean;
  /** A local bake repeats land geometry at this map width. */
  wrapPeriod?: number;
  /** Texels a world unit, after the GPU's limit and the byte budget. */
  density: number;
  /** `density` over the sheet's `texelsPerUnit`; the zoom band is scaled by it. */
  scale: number;
  width: number;
  height: number;
  /** The texture's bytes with its mipmaps. */
  bytes: number;
  /** The plain land's zoom band, in pixels a hex, at this density. */
  nearPixels: number;
  farPixels: number;
  /** What lowered the density below the sheet's, or null. */
  limitedBy: 'gpu' | 'budget' | null;
  /** The board builds the plain land. False when the band could not cover the far detail band. */
  plain: boolean;
  /** Why `plain` is false, or null. */
  reason: 'gpu' | 'budget' | null;
}

export interface GroundPaintInfo {
  width: number; height: number; density: number; bytes: number;
  /** The bake's squares, those drawn, and those passed over because no land lies in them. */
  squares: number; drawn: number; skipped: number;
  /** What the stand-ins of land nobody had drawn yet put on the GPU for the bake, and let go after. */
  uploadedMiB: number;
  steps: number;
  /** The page's own time over every step, the longest one, and each one, in milliseconds (the GPU's work runs after). */
  stepMs: number; longestStepMs: number; stepTimes: number[];
  /** The page's clock at the first step, and the time from the first step to the last, in milliseconds. */
  startedAt: number; wallMs: number;
}

/** What a square of the bake draws: a cut land mesh at one wrap offset, and the bytes drawing it uploads. */
export interface GroundPaintEntry { geometry: BufferGeometry; offset: number; bytes: number; drawn: BufferGeometry | null }

export function groundPaintBox(width: number, height: number): GroundPaintBox;
export function groundPaintPlan(width: number, height: number, maxTextureSize: number,
  sheet?: { enabled: boolean; texelsPerUnit: number; budgetMiB: number; nearPixels: number; farPixels: number },
  lod?: { farPixels: number }): GroundPaintPlan | null;
export function groundPaintSquares(width: number, height: number, size: number): [number, number][];
export function groundPaintEntries(lands: readonly Mesh[], box: { x0: number; x1: number; z0: number; z1: number }, period: number): GroundPaintEntry[];

export interface GroundPaint {
  readonly material: Material;
  readonly uniforms: { groundPaintMap: { value: Texture | null }; groundPaintBox: { value: Vector4 } };
  readonly plan: GroundPaintPlan;
  /** `plains` gives the charted plain land of the middle copy, put on the GPU near the bake's end. */
  step(renderer: WebGLRenderer, lands: readonly Mesh[], plains?: () => readonly Mesh[]): boolean;
  prepare(renderer: WebGLRenderer): void;
  prime(renderer: WebGLRenderer): void;
  readonly ready: boolean;
  readonly pending: boolean;
  readonly failed: boolean;
  readonly info: GroundPaintInfo | null;
  readonly nearPixels: number;
  readonly farPixels: number;
  dispose(): void;
}
export function createGroundPaint(base: MeshStandardMaterial, plan: GroundPaintPlan): GroundPaint;
