import * as T from 'three';
import { VIEW3D } from './lookData';

/**
 * The ground paint texture (`docs/plans/ground-paint-texture-2026-11-18.md`,
 * stages 1 and 2).
 *
 * The pigment painter cuts every brush patch into the land's triangles, so the
 * present land has about five times the triangles its shape needs. Those small
 * triangles make the GPU shade each land pixel four to ten times at the middle
 * and farthest zoom. The plain land is the hex grid and the hill mounds with no
 * patch cut into them, and its shader reads the paint from one texture over the
 * map. The board draws it below a zoom threshold, in place of the present far
 * land; the cut land stays for the closer zooms, where the texture would be soft.
 *
 * Three parts live here:
 * - `groundPaintPlan` decides, before the board is built, whether the map gets a
 *   plain land, and at what density. The density falls to fit the GPU's largest
 *   texture and the byte budget, and the zoom threshold falls with it. When the
 *   lowered threshold could not even cover the far detail band
 *   (`painted.lod`), the plan says no, and the board keeps the present far land.
 * - `material` is the land's material with one change: a face whose vertex
 *   colour carries the mark (red above 1.5; see `paint` in `terrainPigment.js`)
 *   takes its colour from the texture, times the shade in the green channel.
 * - `step` bakes the texture from the cut land's own vertex colours, seen from
 *   straight above, a little at a time. The renderer calls it once a display
 *   frame, so the page never stops for the whole bake. Only the flat ground is
 *   drawn into it (the hex tops, the land a free coast lays in the water, the
 *   beaches and the river banks), so the texture holds the paint as a function
 *   of the place on the map. It holds nothing that changes in play, so nothing
 *   is baked again during a game.
 *
 * The texture covers one wrap period and repeats in x, and the shader reads it
 * by the vertex's own position (before the wrap copy's offset), so the three
 * wrap copies share it.
 */
const GROUND = VIEW3D.painted.groundTexture;
/** sRGB 8-bit RGBA, and a third more for the mipmaps. */
const BYTES_PER_TEXEL = 4 * 4 / 3;
/** Where no land is, the texture is a sand tone, so the filter at a shore mixes toward a beach. */
const CLEAR = 0x9a8a5c;
/** The cut land's attributes the bake reads. */
const BAKED = ['position', 'color', 'paintedRelief', 'paintedSuppress'];

/** The texture's box on the map: one wrap period in x from just left of column 0, and every row with a hex's reach in z. */
export function groundPaintBox(width, height) {
  const period = Math.sqrt(3) * width, z0 = -1.25, z1 = 1.5 * (height - 1) + 1.25;
  return { x0: -1, period, z0, z1, depth: z1 - z0 };
}

/**
 * What the plain land of a map of this size can be on a GPU whose largest
 * texture is `maxTextureSize` texels. Null when the switch is off. Otherwise
 * `plain` says whether the board builds the plain land, and `reason` says why
 * not when it does not.
 *
 * The density is the sheet's, lowered to the most the GPU takes and the most
 * the byte budget allows. The zoom band follows the density, so the plain land
 * is drawn only where a texel is no larger on screen than at the sheet's
 * density and band. That band must start above the far detail band, so that
 * wherever the far props are drawn the land is plain; if it cannot, the board
 * keeps the present far land, which is drawn with the far props.
 */
export function groundPaintPlan(width, height, maxTextureSize, sheet = {
  enabled: GROUND.enabled, texelsPerUnit: GROUND.texelsPerUnit, budgetMiB: GROUND.budgetMiB, nearPixels: GROUND.nearPixels, farPixels: GROUND.farPixels,
}, lod = VIEW3D.painted.lod) {
  if (!sheet.enabled) return null;
  const box = groundPaintBox(width, height);
  const byGpu = maxTextureSize / Math.max(box.period, box.depth);
  const byBudget = Math.sqrt(sheet.budgetMiB * 1048576 / (box.period * box.depth * BYTES_PER_TEXEL));
  const density = Math.min(sheet.texelsPerUnit, byGpu, byBudget);
  const scale = density / sheet.texelsPerUnit;
  const textureWidth = Math.min(maxTextureSize, Math.round(box.period * density));
  const textureHeight = Math.min(maxTextureSize, Math.round(box.depth * density));
  const plan = {
    ...box, density, scale, width: textureWidth, height: textureHeight,
    bytes: Math.round(textureWidth * textureHeight * BYTES_PER_TEXEL),
    nearPixels: sheet.nearPixels * scale, farPixels: sheet.farPixels * scale,
    limitedBy: density === sheet.texelsPerUnit ? null : byGpu <= byBudget ? 'gpu' : 'budget',
    plain: true, reason: null,
  };
  if (!(plan.nearPixels >= lod.farPixels)) { plan.plain = false; plan.reason = plan.limitedBy; }
  return plan;
}

/**
 * The squares the bake draws, in order: bottom row first, each `size` texels
 * on a side, the last of each row and column running past the texture's edge
 * (the viewport clips it).
 */
export function groundPaintSquares(width, height, size) {
  const squares = [];
  for (let py = 0; py < height; py += size) for (let px = 0; px < width; px += size) squares.push([px, py]);
  return squares;
}

/** A square's box on the map, in world units. */
function squareBox(plan, px, py, size) {
  return { x0: plan.x0 + px / plan.width * plan.period, x1: plan.x0 + (px + size) / plan.width * plan.period,
    z0: plan.z1 - (py + size) / plan.height * plan.depth, z1: plan.z1 - py / plan.height * plan.depth };
}

/**
 * What one square draws: each cut land mesh of the middle copy whose box, at
 * one of the three wrap offsets, meets the square. `bytes` is what drawing it
 * uploads: nothing for a mesh already on the GPU (its colours were released at
 * its upload), and its arrays for one nobody has drawn yet (a chunk nobody has
 * charted), which the bake draws through a stand-in.
 */
export function groundPaintEntries(lands, box, period) {
  const entries = [];
  for (const land of lands) {
    const geometry = land.geometry, bounds = geometry.boundingBox;
    if (!bounds || bounds.max.z < box.z0 || bounds.min.z > box.z1) continue;
    for (const offset of [-period, 0, period]) {
      if (bounds.max.x + offset < box.x0 || bounds.min.x + offset > box.x1) continue;
      const uploaded = !geometry.getAttribute('color').array;
      const bytes = uploaded ? 0 : BAKED.reduce((sum, name) => sum + geometry.getAttribute(name).array.byteLength, geometry.index?.array.byteLength ?? 0);
      entries.push({ geometry, offset, bytes, drawn: null });
    }
  }
  return entries;
}

/**
 * The plain land's material and the texture's bake. `base` is the merged land's
 * material; `plan` is `groundPaintPlan`'s answer, with `plain` true.
 */
export function createGroundPaint(base, plan) {
  const uniforms = {
    groundPaintMap: { value: null },
    groundPaintBox: { value: new T.Vector4(plan.x0, plan.z1, 1 / plan.period, 1 / plan.depth) },
  };
  const material = base.clone();
  material.onBeforeCompile = (shader, renderer) => {
    base.onBeforeCompile(shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    // `studyPosition` is the vertex's own position, which the land's shader already carries. The base's own
    // `#include <color_fragment>` line is the first one; what the base adds after it (the grain, the turf) follows.
    shader.fragmentShader = 'uniform sampler2D groundPaintMap; uniform vec4 groundPaintBox;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
      vec3 groundPaint = texture2D(groundPaintMap, vec2((studyPosition.x - groundPaintBox.x) * groundPaintBox.z, (groundPaintBox.y - studyPosition.z) * groundPaintBox.w)).rgb;
      diffuseColor.rgb *= vColor.r > 1.5 ? groundPaint * vColor.g : vColor.rgb;
    `);
  };
  material.customProgramCacheKey = () => `${base.customProgramCacheKey()}:ground-paint`;

  let target = null, job = null, info = null, failed = false, disposed = false;

  /** The bake's own targets, materials and cameras, made on its first step and let go after its last. */
  function begin(renderer) {
    const limit = renderer.capabilities.maxTextureSize;
    if (plan.width > limit || plan.height > limit) throw new Error(`The ground paint texture (${plan.width} by ${plan.height}) is larger than this GPU's largest texture (${limit})`);
    target = new T.WebGLRenderTarget(plan.width, plan.height, {
      colorSpace: T.SRGBColorSpace, depthBuffer: false,
      // The mipmaps are made once, after the last square; three would make them again after every square.
      generateMipmaps: false,
      minFilter: T.LinearMipmapLinearFilter, magFilter: T.LinearFilter, wrapS: T.RepeatWrapping, wrapT: T.ClampToEdgeWrapping,
      anisotropy: Math.min(GROUND.anisotropy, renderer.capabilities.getMaxAnisotropy()),
    });
    // Each square is drawn with MSAA (`bakeSamples`), so a patch edge is smooth in the texture.
    const tile = new T.WebGLRenderTarget(GROUND.bakeSquare, GROUND.bakeSquare, {
      colorSpace: T.SRGBColorSpace, samples: GROUND.bakeSamples, depthBuffer: true,
      generateMipmaps: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter,
    });
    // A target of one texel: the stand-ins are drawn into it to put their arrays on the GPU a few at a time.
    const sink = new T.WebGLRenderTarget(1, 1, { depthBuffer: false, generateMipmaps: false });
    // The flat ground only: a hill face or a crease (`paintedRelief` 1) and a piece a town clears away (the turf,
    // `paintedSuppress` above 0) are moved off the picture. The beaches and the river banks are drawn: they lie on
    // the hex tops, and the plain land has no piece for them.
    const paint = new T.ShaderMaterial({
      vertexShader: `attribute vec3 color; attribute float paintedRelief; attribute float paintedSuppress; varying vec3 paintColor;
        void main() { paintColor = color; gl_Position = paintedRelief > .5 || paintedSuppress > .5 ? vec4(2., 2., 2., 1.) : projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: 'varying vec3 paintColor; void main() { gl_FragColor = vec4(paintColor, 1.); }',
    });
    // The camera looks straight down with x to the right and z down the picture, so a texel row's v is (z1 - z) / depth.
    const camera = new T.OrthographicCamera(0, 1, 1, 0, .1, 60);
    camera.up.set(0, 0, -1); camera.position.set(0, 30, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
    // One degenerate face with the four attributes, to link the bake's program and to use it once.
    const probe = new T.Scene(), shape = new T.BufferGeometry();
    for (const name of BAKED) shape.setAttribute(name, new T.BufferAttribute(new Float32Array(name === 'position' || name === 'color' ? 9 : 3), name === 'position' || name === 'color' ? 3 : 1));
    const probeMesh = new T.Mesh(shape, paint);
    probeMesh.frustumCulled = false; probe.add(probeMesh);
    job = { tile, sink, paint, camera, probe, shape, phase: 'link', linked: false, primed: false, sent: new Set(),
      squares: groundPaintSquares(plan.width, plan.height, GROUND.bakeSquare), next: 0, square: null,
      drawn: 0, skipped: 0, uploadedBytes: 0, steps: 0, ms: 0, longestMs: 0, times: [], started: null };
    // The targets' memory is taken now, and not in the first step that draws.
    for (const one of [target, tile, sink]) renderer.initRenderTarget?.(one);
    // The program is linked off the page's thread where the GPU allows it (`compileAsync`), against a render target,
    // as the bake draws.
    if (!renderer.compileAsync) { job.linked = true; return; }
    const previous = renderer.getRenderTarget();
    try {
      renderer.setRenderTarget(tile);
      renderer.compileAsync(probe, camera).then(() => { if (job) job.linked = true; }, () => { if (job) job.linked = true; });
    } finally { renderer.setRenderTarget(previous); }
  }

  /**
   * The first use of the bake's program: three asks WebGL for its link log
   * and its uniforms then, and each of those calls waits for the GPU to finish
   * every frame it has queued. Measured at turn 130 under load, it stopped a
   * step for 1.2 s; done before the board's first frame (`prime`), the GPU has
   * nothing queued and it costs about nothing.
   */
  function firstUse(renderer) {
    renderer.autoClear = false;
    // Into both kinds of target the bake draws into: the GPU's driver makes its state for each kind on the first draw.
    for (const into of [job.sink, job.tile]) { renderer.setRenderTarget(into); renderer.render(job.probe, job.camera); }
    job.primed = true;
  }

  function end() {
    if (!job) return;
    for (const entry of job.square?.entries ?? []) if (entry.drawn && entry.drawn !== entry.geometry) entry.drawn.dispose();
    job.tile.dispose(); job.sink.dispose(); job.paint.dispose(); job.shape.dispose();
    if (job.read) job.gl.deleteFramebuffer(job.read);
    job = null;
  }

  /** Runs `work` with the renderer's target, clear colour and clear flag put back after it. */
  function keeping(renderer, work) {
    const was = { target: renderer.getRenderTarget(), autoClear: renderer.autoClear,
      color: renderer.getClearColor(new T.Color()), alpha: renderer.getClearAlpha() };
    try { return work(); } finally {
      renderer.setRenderTarget(was.target); renderer.autoClear = was.autoClear; renderer.setClearColor(was.color, was.alpha);
    }
  }

  /** A geometry that shares a cut land mesh's arrays, so drawing it does not upload, or release, the board's own. */
  function standIn(geometry) {
    const drawn = new T.BufferGeometry();
    for (const name of BAKED) {
      const attribute = geometry.getAttribute(name);
      drawn.setAttribute(name, new T.BufferAttribute(attribute.array, attribute.itemSize, attribute.normalized));
    }
    if (geometry.index) drawn.setIndex(new T.BufferAttribute(geometry.index.array, 1));
    return drawn;
  }

  function sceneOf(entries) {
    const scene = new T.Scene();
    for (const entry of entries) {
      const mesh = new T.Mesh(entry.drawn, job.paint);
      mesh.position.x = entry.offset; mesh.frustumCulled = false;
      scene.add(mesh);
    }
    scene.updateMatrixWorld(true);
    return scene;
  }

  /**
   * The GPU copies the drawn square into the texture at (x, y): `copyTexSubImage2D` from a framebuffer that holds
   * the square, through three's own state so its record of what is bound stays true. No program is needed, and no
   * call waits for the GPU (three's `copyTextureToTexture` reads five settings back from WebGL a copy, and the
   * first such read waited 1.3 s at turn 130 under load).
   */
  function copySquare(renderer, x, y, width, height) {
    const gl = renderer.getContext(), state = renderer.state;
    if (!job.read) {
      job.read = gl.createFramebuffer(); job.gl = gl;
      state.bindFramebuffer(gl.READ_FRAMEBUFFER, job.read);
      gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderer.properties.get(job.tile.texture).__webglTexture, 0);
    } else state.bindFramebuffer(gl.READ_FRAMEBUFFER, job.read);
    state.bindTexture(gl.TEXTURE_2D, renderer.properties.get(target.texture).__webglTexture);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, x, y, 0, 0, width, height);
    state.unbindTexture();
    state.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  }

  /** Points the bake's camera at one square. */
  function aim(box) {
    const camera = job.camera;
    camera.left = box.x0; camera.right = box.x1; camera.bottom = -box.z1; camera.top = -box.z0;
    camera.updateProjectionMatrix();
  }

  /**
   * The work of one step, by phase:
   * - `link`: waits for the program, uses it once if `prime` has not, and clears the texture to the sand tone.
   * - `squares`: the next square with land in it. Its stand-ins go to the GPU at most `bakeStepMiB` a step (drawn
   *   into a texel nobody reads); then one step draws the whole square with MSAA, and the GPU copies it into the
   *   texture (`copySquare`, which needs no program of its own).
   * - `plains`: the charted plain land (`plains()`, the board's) goes to the GPU, at most `bakeStepMiB` a step.
   * - `mipmaps`: the mipmaps, once, and the bake is finished.
   * Returns true when the bake is finished.
   */
  function work(renderer, lands, plains) {
    if (job.phase === 'link') {
      if (!job.linked) return false;
      if (!job.primed) firstUse(renderer);
      renderer.setClearColor(CLEAR, 1);
      renderer.setRenderTarget(target); renderer.clear(true, false, false);
      job.phase = 'squares';
      return false;
    }
    if (job.phase === 'squares') {
      const size = GROUND.bakeSquare;
      while (!job.square && job.next < job.squares.length) {
        const [px, py] = job.squares[job.next++], box = squareBox(plan, px, py, size);
        const entries = groundPaintEntries(lands, box, plan.period);
        if (entries.length) job.square = { px, py, box, entries, uploaded: 0 };
        else job.skipped++;
      }
      const square = job.square;
      if (!square) { job.phase = 'plains'; return false; }
      aim(square.box);
      if (square.uploaded < square.entries.length) {
        const budget = GROUND.bakeStepMiB * 1048576, batch = [];
        let bytes = 0;
        while (square.uploaded < square.entries.length && (!batch.length || bytes + square.entries[square.uploaded].bytes <= budget)) {
          const entry = square.entries[square.uploaded++];
          entry.drawn = entry.bytes ? standIn(entry.geometry) : entry.geometry;
          if (entry.bytes) { batch.push(entry); bytes += entry.bytes; }
        }
        if (batch.length) {
          renderer.autoClear = false;
          renderer.setRenderTarget(job.sink); renderer.render(sceneOf(batch), job.camera);
          job.uploadedBytes += bytes;
          return false;
        }
      }
      renderer.setClearColor(CLEAR, 1);
      renderer.autoClear = true;
      renderer.setRenderTarget(job.tile); renderer.render(sceneOf(square.entries), job.camera);
      // The last square of a row or a column runs past the texture's edge; the copy takes only the part inside it.
      copySquare(renderer, square.px, square.py, Math.min(size, plan.width - square.px), Math.min(size, plan.height - square.py));
      for (const entry of square.entries) if (entry.drawn !== entry.geometry) entry.drawn.dispose();
      job.square = null; job.drawn++;
      return false;
    }
    if (job.phase === 'plains') {
      // The charted plain land not yet on the GPU goes up `bakeStepMiB` a step, drawn into the texel nobody reads,
      // so the frame that first shows the plain land does not upload it all at once (0.5 s at turn 130 under load).
      // This is the board's own geometry: its colours are released at the upload, as a frame's draw would.
      const budget = GROUND.bakeStepMiB * 1048576, batch = [];
      let bytes = 0;
      for (const mesh of plains()) {
        if (job.sent.has(mesh.geometry) || !mesh.geometry.getAttribute('color').array) continue;
        const size = Object.values(mesh.geometry.attributes).reduce((sum, a) => sum + a.array.byteLength, mesh.geometry.index?.array.byteLength ?? 0);
        if (batch.length && bytes + size > budget) break;
        batch.push({ drawn: mesh.geometry, offset: 0 }); bytes += size; job.sent.add(mesh.geometry);
      }
      if (!batch.length) { job.phase = 'mipmaps'; return false; }
      aim({ x0: 0, x1: 1, z0: 0, z1: 1 });
      renderer.autoClear = false;
      renderer.setRenderTarget(job.sink); renderer.render(sceneOf(batch), job.camera);
      job.uploadedBytes += bytes;
      return false;
    }
    // The mipmaps, once. Three makes them after a render into a target whose texture asks for them, and an empty
    // scene drawn with no clear changes no texel. WebGL reports a texture the GPU had no room for only through
    // `getError`, which waits for every frame the GPU has queued (30 to 50 ms on a loaded page), so it is not asked:
    // the byte budget is the guard.
    target.texture.generateMipmaps = true;
    renderer.autoClear = false;
    renderer.setRenderTarget(target); renderer.render(new T.Scene(), job.camera);
    return true;
  }

  /**
   * One step of the bake. `lands` are the board's cut land meshes of the middle
   * copy. Returns true on the step that finishes it; from then on `ready` is
   * true and the texture is on the material. The renderer's target, clear
   * colour and clear flag are put back after each step.
   */
  function step(renderer, lands, plains = () => []) {
    if (disposed || failed || info) return false;
    const started = performance.now();
    try {
      if (!job) begin(renderer);
      job.started ??= started;
      const phase = job.phase === 'squares' ? job.square && job.square.uploaded >= job.square.entries.length ? 'draw' : 'squares' : job.phase;
      const finished = keeping(renderer, () => work(renderer, lands, plains));
      const ms = performance.now() - started;
      job.steps++; job.ms += ms; job.longestMs = Math.max(job.longestMs, ms); job.times.push(`${phase} ${Math.round(ms * 10) / 10}`);
      if (!finished) return false;
      info = { width: plan.width, height: plan.height, density: plan.density, bytes: plan.bytes,
        squares: job.squares.length, drawn: job.drawn, skipped: job.skipped, uploadedMiB: Math.round(job.uploadedBytes / 1048576),
        steps: job.steps, stepMs: Math.round(job.ms * 10) / 10, longestStepMs: Math.round(job.longestMs * 10) / 10, stepTimes: job.times,
        startedAt: Math.round(job.started), wallMs: Math.round(performance.now() - job.started) };
      uniforms.groundPaintMap.value = target.texture;
      end();
      return true;
    } catch (error) {
      // The board keeps the cut land at every zoom (`ready` stays false).
      failed = true; end(); target?.dispose(); target = null;
      console.warn('The ground paint texture could not be baked; the board keeps its cut land at every zoom.', error);
      return false;
    }
  }

  /** Guards `begin` and `firstUse` outside a step: a failure there is the bake's failure. */
  function guarded(work) {
    if (disposed || failed || info) return;
    try { work(); } catch (error) {
      failed = true; end(); target?.dispose(); target = null;
      console.warn('The ground paint texture could not be baked; the board keeps its cut land at every zoom.', error);
    }
  }

  return {
    material, uniforms, plan, step,
    /** Makes the bake's targets and starts linking its program. The renderer calls it when the board is built. */
    prepare(renderer) { guarded(() => { if (!job) begin(renderer); }); },
    /**
     * Uses the bake's program once, linking it now if `compileAsync` has not finished. The renderer calls it just
     * before the board's first frame, which is long anyway and has nothing queued before it (see `firstUse`).
     * Without it, the bake's first step does it.
     */
    prime(renderer) { guarded(() => { if (!job) begin(renderer); if (!job.primed) keeping(renderer, () => firstUse(renderer)); }); },
    /** The texture is baked and the plain land may be drawn. */
    get ready() { return !!info; },
    /** The bake has steps left. */
    get pending() { return !disposed && !failed && !info; },
    get failed() { return failed; },
    get info() { return info; },
    /**
     * The plain land's zoom band, in pixels a hex: drawn below `nearPixels`, and kept up to `farPixels`. Read from
     * the plan on each call, so a measuring page can move the band on a built board.
     */
    get nearPixels() { return plan.nearPixels; },
    get farPixels() { return plan.farPixels; },
    dispose() { disposed = true; end(); target?.dispose(); target = null; uniforms.groundPaintMap.value = null; material.dispose(); },
  };
}
