import * as T from 'three';
import { VIEW3D } from './lookData';

/**
 * The measuring test for the ground paint texture (2026-11-18). A test, not the
 * build: `docs/plans/ground-paint-texture-2026-11-18.md` has the plan, and
 * `painted.groundTexture.test` in `data/view3d.json` is the switch (off).
 *
 * The question it answers: how much shorter is a panning frame when the land
 * is a plain mesh that reads its paint from a texture? Today the pigment
 * painter cuts every brush patch into the land's triangles, so the land has
 * about five times the triangles its shape needs.
 *
 * What it does:
 * - `material` is the land's material with one change: a face whose vertex
 *   colour carries the mark (red above 1.5; see `paint` in `terrainPigment.js`)
 *   takes its colour from the texture, times the shade in the green channel.
 *   The board gives this material to its plain land.
 * - `bake` draws the near land's own vertex colours from straight above into
 *   one texture that covers one wrap period of the map. Only the flat plates
 *   are drawn (not the hill mounds and not the creases), so the texture holds
 *   the paint as a function of the place on the map and nothing else. A hill
 *   mound reads the same paint and keeps its own shade in its vertex colour.
 * - The texture repeats in x, and the shader reads it by the vertex's own
 *   position (before the wrap copy's offset), so the three copies share it.
 *
 * To delete the test: this file, the `groundPaint` lines in `paintedBoard.js`,
 * the `plain` argument of `paint`, the `groundTexture` rows of the sheet, their
 * type and their register row, and the one call in `renderer3d.ts`.
 */
const GROUND_PAINT = VIEW3D.painted.groundTexture;
/** The bake draws the map in squares of this many texels, each with 4x MSAA, so a patch edge is smooth in the texture. */
const TILE = 2048;

export function createGroundPaintTest(base, period, rows) {
  // One period in x. In z, every row and a margin for a hex's own reach.
  const x0 = -1, z0 = -1.25, z1 = 1.5 * (rows - 1) + 1.25, depth = z1 - z0;
  const uniforms = { groundPaintMap: { value: null }, groundPaintBox: { value: new T.Vector4(x0, z1, 1 / period, 1 / depth) } };
  const material = base.clone();
  material.onBeforeCompile = (shader, renderer) => {
    base.onBeforeCompile(shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    // `studyPosition` is the vertex's own position, which the land's shader already carries.
    shader.fragmentShader = 'uniform sampler2D groundPaintMap; uniform vec4 groundPaintBox;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
      vec3 groundPaint = texture2D(groundPaintMap, vec2((studyPosition.x - groundPaintBox.x) * groundPaintBox.z, (groundPaintBox.y - studyPosition.z) * groundPaintBox.w)).rgb;
      diffuseColor.rgb *= vColor.r > 1.5 ? groundPaint * vColor.g : vColor.rgb;
    `);
  };
  material.customProgramCacheKey = () => `${base.customProgramCacheKey()}:ground-paint-test`;

  let target = null, info = null;
  /**
   * `lands` are the near land's meshes of the middle copy. Returns the
   * texture's size, its bytes with its mipmaps, and the time the bake took
   * (the GPU's work included: one pixel is read back before the clock stops).
   */
  function bake(renderer, lands, density = GROUND_PAINT.texelsPerUnit) {
    const started = performance.now();
    const limit = renderer.capabilities.maxTextureSize;
    const scale = Math.min(1, limit / (period * density), limit / (depth * density));
    const width = Math.round(period * density * scale), height = Math.round(depth * density * scale);
    target?.dispose();
    target = new T.WebGLRenderTarget(width, height, { colorSpace: T.SRGBColorSpace, depthBuffer: false, generateMipmaps: true,
      minFilter: T.LinearMipmapLinearFilter, magFilter: T.LinearFilter, wrapS: T.RepeatWrapping, wrapT: T.ClampToEdgeWrapping,
      anisotropy: Math.min(GROUND_PAINT.anisotropy, renderer.capabilities.getMaxAnisotropy()) });
    const tile = new T.WebGLRenderTarget(TILE, TILE, { colorSpace: T.SRGBColorSpace, samples: 4, depthBuffer: true,
      generateMipmaps: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
    // The flat ground only: a hill face or a crease (`paintedRelief` 1) and a piece a town clears away (the turf,
    // `paintedSuppress` above 0) are moved off the picture. The beaches and the river banks are drawn: they lie on
    // the hex tops, and the plain land has no piece for them.
    const paint = new T.ShaderMaterial({
      vertexShader: `attribute vec3 color; attribute float paintedRelief; attribute float paintedSuppress; varying vec3 paintColor;
        void main() { paintColor = color; gl_Position = paintedRelief > .5 || paintedSuppress > .5 ? vec4(2., 2., 2., 1.) : projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: 'varying vec3 paintColor; void main() { gl_FragColor = vec4(paintColor, 1.); }',
    });
    const scene = new T.Scene();
    for (const land of lands) for (const offset of [-period, 0, period]) {
      const mesh = new T.Mesh(land.geometry, paint);
      mesh.position.x = offset; scene.add(mesh);
    }
    scene.updateMatrixWorld(true);
    const camera = new T.OrthographicCamera(0, 1, 1, 0, .1, 60);
    camera.up.set(0, 0, -1); camera.position.set(0, 30, 0); camera.lookAt(0, 0, 0);
    const copy = new T.Scene(), copyCamera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), new T.MeshBasicMaterial({ map: tile.texture, depthTest: false, depthWrite: false, toneMapped: false }));
    quad.frustumCulled = false; copy.add(quad);

    const was = { target: renderer.getRenderTarget(), autoClear: renderer.autoClear, color: renderer.getClearColor(new T.Color()), alpha: renderer.getClearAlpha() };
    // Where no land is, the texture is a sand tone, so the filter at a shore mixes toward a beach.
    renderer.setClearColor(0x9a8a5c, 1);
    for (let py = 0; py < height; py += TILE) for (let px = 0; px < width; px += TILE) {
      // The camera looks down with x to the right and z downward, so the picture's top is the low z.
      camera.left = x0 + px / width * period; camera.right = x0 + (px + TILE) / width * period;
      camera.bottom = -(z1 - py / height * depth); camera.top = -(z1 - (py + TILE) / height * depth);
      camera.updateProjectionMatrix();
      renderer.autoClear = true;
      renderer.setRenderTarget(tile); renderer.render(scene, camera);
      renderer.autoClear = false;
      target.viewport.set(px, py, TILE, TILE);
      renderer.setRenderTarget(target); renderer.render(copy, copyCamera);
    }
    target.viewport.set(0, 0, width, height);
    // Wait for the GPU, so the time is the bake's whole cost.
    renderer.readRenderTargetPixels(target, 0, 0, 1, 1, new Uint8Array(4));
    renderer.setRenderTarget(was.target); renderer.autoClear = was.autoClear; renderer.setClearColor(was.color, was.alpha);
    tile.dispose(); paint.dispose(); quad.geometry.dispose(); quad.material.dispose();
    uniforms.groundPaintMap.value = target.texture;
    info = { width, height, density: density * scale, bytes: Math.round(width * height * 4 * 4 / 3), ms: performance.now() - started, meshes: lands.length };
    return info;
  }
  return {
    material, uniforms, bake,
    get info() { return info; },
    dispose() { target?.dispose(); target = null; material.dispose(); },
  };
}
