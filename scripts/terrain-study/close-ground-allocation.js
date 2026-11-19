import { MeshStandardMaterial, WebGLRenderer } from 'three';
import { closeGroundBaseSheet } from '../../src/render3d/closeGroundPaint';
import { createGroundPaint, groundPaintPlan } from '../../src/render3d/groundPaint';
import { VIEW3D } from '../../src/render3d/lookData';

/** Exercise the real bake targets at Giant dimensions without building a Giant board. */
export async function checkGiantAllocation(canvas) {
  const renderer = new WebGLRenderer({ canvas });
  const material = new MeshStandardMaterial();
  const gl = renderer.getContext();
  const basePlan = groundPaintPlan(180, 112, renderer.capabilities.maxTextureSize, closeGroundBaseSheet());
  const closePlan = { ...basePlan, wrapPeriod: basePlan.period, period: 32, depth: 24, z0: 0, z1: 24,
    width: 2048, height: 1536, density: 64, bytes: 16 * 1048576 };
  const paints = [basePlan, closePlan, closePlan].map(plan => createGroundPaint(material, plan));
  const errors = [];
  function check(label) {
    gl.finish();
    const code = gl.getError();
    errors.push({ label, code });
    if (code !== gl.NO_ERROR || gl.isContextLost()) throw Error(label + ' failed with WebGL error ' + code);
  }
  try {
    for (const [index, paint] of paints.entries()) {
      paint.prepare(renderer);
      check('allocate ' + index);
      while (paint.pending) {
        await new Promise(requestAnimationFrame);
        paint.step(renderer, []);
      }
      if (!paint.ready) throw Error('Bake failed at target ' + index);
      check('finish mipmaps ' + index);
    }
    const { bakeSquare, bakeSamples } = VIEW3D.painted.groundTexture;
    const samples = Math.min(bakeSamples, renderer.capabilities.maxSamples);
    const scratchBytes = bakeSquare ** 2 * (samples + 1) * 8;
    const peakBytes = paints.reduce((total, paint) => total + paint.plan.bytes, scratchBytes + 4);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return { gpu: gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER), samples, scratchBytes,
      base: basePlan, close: closePlan, peakBytes, errors };
  } finally {
    for (const paint of paints) paint.dispose();
    material.dispose();
    renderer.dispose();
  }
}
