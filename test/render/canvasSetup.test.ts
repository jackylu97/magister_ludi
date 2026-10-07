/**
 * How the game canvas is created and sized (WebGL audit 2026-10-06, findings 7,
 * 8 and 11). Pure functions, so no GPU is needed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canvasAttributes, drawingBufferRatio, probeGraphics, watchPixelRatio } from '../../src/render3d/canvasSetup';
import { VIEW3D } from '../../src/render3d/lookData';

const RENDERER = import.meta.glob('../../src/render3d/renderer3d.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const ABACUS = import.meta.glob('../../src/render3d/abacus3d.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('the canvas the painted look draws to', () => {
  it('asks for no multisampling, depth or stencil: only a full-screen pass lands on it', () => {
    expect(canvasAttributes(true)).toEqual({ antialias: false, depth: false, stencil: false });
  });

  it('keeps all three for the toon look, which draws the scene straight to the canvas', () => {
    expect(canvasAttributes(false)).toEqual({ antialias: true, depth: true, stencil: true });
  });

  it('is what the renderer creates its WebGL context with', () => {
    const source = Object.values(RENDERER)[0]!;
    expect(source).toContain('new WebGLRenderer({ canvas, ...canvasAttributes(this.paintedCanvas) })');
  });
});

describe('the drawing buffer size', () => {
  const { maxPixelRatio, pixelBudget } = VIEW3D.painted.canvas;

  it('caps a Retina laptop at the painted ratio', () => {
    expect(drawingBufferRatio(1440, 900, 2, maxPixelRatio, pixelBudget)).toBe(1.5);
  });

  it('never supersamples past the device ratio', () => {
    expect(drawingBufferRatio(800, 600, 1, maxPixelRatio, pixelBudget)).toBe(1);
  });

  it('lowers the ratio on a 4K monitor at 100% scaling so the buffer fits the budget', () => {
    const ratio = drawingBufferRatio(3840, 2160, 1, maxPixelRatio, pixelBudget);
    expect(ratio).toBeLessThan(1);
    expect(3840 * 2160 * ratio * ratio).toBeCloseTo(pixelBudget, -2);
  });

  it('lowers a large Retina window as well', () => {
    const ratio = drawingBufferRatio(2560, 1440, 2, maxPixelRatio, pixelBudget);
    expect(ratio).toBeLessThan(1.5);
    expect(2560 * 1440 * ratio * ratio).toBeLessThanOrEqual(pixelBudget + 1);
  });

  it('treats a missing device ratio as 1', () => {
    expect(drawingBufferRatio(800, 600, 0, maxPixelRatio, pixelBudget)).toBe(1);
  });
});

describe('a change of screen scale', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('is heard once through a resolution media query for the current ratio', () => {
    const listeners: (() => void)[] = [];
    const queries: string[] = [];
    vi.stubGlobal('matchMedia', (query: string) => {
      queries.push(query);
      return {
        addEventListener: (_: string, listener: () => void) => { listeners.push(listener); },
        removeEventListener: (_: string, listener: () => void) => { listeners.splice(listeners.indexOf(listener), 1); },
      };
    });
    const changed = vi.fn();
    const stop = watchPixelRatio(1.5, changed);
    expect(queries).toEqual(['(resolution: 1.5dppx)']);
    listeners[0]!();
    expect(changed).toHaveBeenCalledOnce();
    stop();
    expect(listeners).toHaveLength(0);
  });

  it('does nothing where matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(() => watchPixelRatio(2, () => undefined)()).not.toThrow();
  });
});

describe('the graphics probe', () => {
  function canvas(context: unknown): () => HTMLCanvasElement {
    return () => ({ getContext: () => context }) as unknown as HTMLCanvasElement;
  }

  it('reports no WebGL2 when the context cannot be created', () => {
    expect(probeGraphics(canvas(null))).toEqual({ webgl2: false, floatTargets: false });
  });

  it('reports half-float targets from either extension, and releases the context', () => {
    for (const present of ['EXT_color_buffer_float', 'EXT_color_buffer_half_float']) {
      const lose = vi.fn();
      const gl = { getExtension: (name: string) => name === present ? {} : name === 'WEBGL_lose_context' ? { loseContext: lose } : null };
      expect(probeGraphics(canvas(gl))).toEqual({ webgl2: true, floatTargets: true });
      expect(lose).toHaveBeenCalledOnce();
    }
  });

  it('reports no half-float targets when neither extension exists', () => {
    const gl = { getExtension: () => null };
    expect(probeGraphics(canvas(gl))).toEqual({ webgl2: true, floatTargets: false });
  });
});

describe('the toon shadow type', () => {
  it('asks for the shadow type three r185 still supports', () => {
    for (const source of [Object.values(RENDERER)[0]!, Object.values(ABACUS)[0]!]) {
      expect(source).not.toMatch(/shadowMap\.type = PCFSoftShadowMap/);
      expect(source).toMatch(/shadowMap\.type = PCFShadowMap/);
    }
  });
});
