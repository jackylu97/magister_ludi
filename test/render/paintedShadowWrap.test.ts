import { beforeAll, describe, expect, it } from 'vitest';
import {
  DirectionalLight, Matrix4, Mesh, MeshStandardMaterial, MeshToonMaterial, Object3D,
  PlaneGeometry, Scene, ShaderChunk, Vector3, Vector4,
} from 'three';

// @ts-expect-error The browser helper is JavaScript, with no standalone declaration.
import { createShadowWrap, PAINTED_SHADOW_CHUNKS } from '../../src/render3d/paintedShadowWrap.js';

/**
 * The canonical-period shadow lookup (audit finding #3, P11).
 *
 * The static sun used to bake all three wrap copies of the cylinder. Baking one
 * and wrapping the lookup is only correct if the wrap is the *shear* the light
 * actually applies — a period of world x is a fixed displacement of the shadow
 * coordinate sideways **and** in depth, not a `mod` on a texture coordinate —
 * and only useful if every material that reads the map performs it. These tests
 * hold both halves: the shear against a brute-force three-copy bake on a small
 * fixture, and the register of receivers against a scene with a material the
 * painted style never registered in it.
 */

const FS_SPECIFIER = 'node:fs';
let readFileSync: (path: URL, encoding: string) => string;
beforeAll(async () => {
  const fs = (await import(/* @vite-ignore */ FS_SPECIFIER)) as { readFileSync: typeof readFileSync };
  readFileSync = fs.readFileSync;
});

type Shader = { vertexShader: string; fragmentShader: string; uniforms: Record<string, unknown> };

/** A material three has not compiled yet, and the shader three would hand it. */
function compile(material: MeshStandardMaterial | MeshToonMaterial): Shader {
  const shader: Shader = {
    vertexShader: '#include <common>\n#include <worldpos_vertex>\n#include <shadowmap_vertex>\n',
    fragmentShader: '#include <common>\n#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>\n#include <lights_fragment_begin>\n',
    uniforms: {},
  };
  (material.onBeforeCompile as (s: Shader, r: unknown) => void)(shader, null);
  return shader;
}

describe('the painted period wrap — the chunks it derives', () => {
  it('adds its two chunks to three’s table without touching three’s own', () => {
    expect(PAINTED_SHADOW_CHUNKS).toEqual(['painted_shadowmask_pars_fragment', 'painted_lights_fragment_begin']);
    for (const name of PAINTED_SHADOW_CHUNKS) {
      const source = (ShaderChunk as Record<string, string>)[name.replace('painted_', '')]!;
      const derived = (ShaderChunk as Record<string, string>)[name]!;
      // A three that renamed the varying would silently make the patch a no-op,
      // and every wrap copy would lose its shadows. Fail here instead.
      expect(source).toContain('vDirectionalShadowCoord[ i ]');
      expect(derived).not.toBe(source);
      expect(derived).toContain('paintedWrapShadow( vDirectionalShadowCoord[ i ], UNROLLED_LOOP_INDEX )');
      // The index token is three's own, and the unroller replaces it with a
      // literal — so the function can tell the static sun from the counters.
      expect(derived).not.toContain('paintedWrapShadow( vDirectionalShadowCoord[ i ], i )');
    }
  });
});

describe('the painted period wrap — who wraps', () => {
  function scene(): { scene: Scene; ground: MeshStandardMaterial; marker: MeshToonMaterial; unlit: MeshStandardMaterial } {
    const world = new Scene();
    const ground = new MeshStandardMaterial(), marker = new MeshToonMaterial(), unlit = new MeshStandardMaterial();
    const add = (material: MeshStandardMaterial | MeshToonMaterial, receives: boolean): void => {
      const mesh = new Mesh(new PlaneGeometry(1, 1), material);
      mesh.receiveShadow = receives;
      world.add(mesh);
    };
    add(ground, true);
    // The frozen toon layers still stand under the painted art — the site
    // markers' ink stake is one mesh with a material the painted style never
    // registered. It reads the same map and so must wrap with everything else.
    add(marker, true);
    add(unlit, false);
    world.add(new Object3D());
    return { scene: world, ground, marker, unlit };
  }

  /**
   * The fog's chart table is a receiver, and the sweep is why nobody had to be
   * told. It arrived after this wrap did (F1, the shadowed fog): a real plane
   * standing where the board is uncharted, one clone a wrap copy, taking the
   * sun like everything else on the table. A list of receivers would have been
   * one short and the paper would have stood unshadowed on two copies in three.
   */
  it('counts the fog’s chart table among the receivers, by the board’s own source', () => {
    const board = readFileSync(new URL('../../src/render3d/paintedBoard.js', import.meta.url), 'utf8');
    const table = board.slice(board.indexOf('createChartTable(register)'), board.indexOf('return mesh;', board.indexOf('createChartTable(register)')));
    expect(table).toContain('mesh.receiveShadow = true;');
    // It is the painted style's material, so the sweep meets it with every
    // other hook already on — the wrap goes outermost, where it must be.
    expect(table).toContain('register?.(material)');
    expect(table).toContain('paintedChartMaterial(material, fog)');
  });

  it('wraps a chart-table material over the fog installer that rewrites its main', () => {
    const wrap = createShadowWrap();
    const sun = new DirectionalLight();
    sun.position.set(40, 30, -24); sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
    wrap.setBand(sun, 0, 20);
    // `paintedChartMaterial` in miniature: a second hook over the style's, which
    // rewrites `main` and the opaque fragment and appends its own cache key.
    const material = new MeshStandardMaterial();
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'void main() {\n// chart discard');
    };
    material.customProgramCacheKey = () => `${key()}:painted-chart-v1`;
    expect(wrap.install(material)).toBe(true);
    const shader = compile(material);
    expect(shader.fragmentShader).toContain('#include <painted_shadowmask_pars_fragment>');
    expect(shader.fragmentShader.split('vec4 paintedWrapShadow(').length - 1).toBe(1);
    expect(material.customProgramCacheKey()).toContain(':painted-chart-v1:painted-period-wrap');
  });

  it('leaves every material alone while the knob is off', () => {
    const wrap = createShadowWrap();
    const { scene: world, ground } = scene();
    expect(wrap.live).toBe(false);
    expect(wrap.sweep(world)).toBe(0);
    expect(ground.customProgramCacheKey()).not.toContain('painted-period-wrap');
  });

  it('catches every receiver in the scene, painted or not, and only receivers', () => {
    const wrap = createShadowWrap();
    const { scene: world, ground, marker, unlit } = scene();
    const sun = new DirectionalLight();
    sun.position.set(40, 30, -24); sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
    wrap.setBand(sun, 0, 20);
    expect(wrap.live).toBe(true);
    expect(wrap.sweep(world)).toBe(2);
    // Idempotent: a bake is not a recompile of the whole board.
    expect(wrap.sweep(world)).toBe(0);
    for (const material of [ground, marker]) expect(material.customProgramCacheKey()).toContain('painted-period-wrap');
    expect(unlit.customProgramCacheKey()).not.toContain('painted-period-wrap');
  });

  /**
   * The board clones the look's materials for the fog and keeps the original's
   * compile hook on the clone (`paintedFogMaterial`), so a clone of a patched
   * material arrives in the scene already wrapped, under a new object the set
   * has never seen. Patching it again defines the wrap's uniforms and its
   * function twice and the shader does not compile at all.
   */
  it('will not wrap a clone of a material that is already wrapped', () => {
    const wrap = createShadowWrap();
    const sun = new DirectionalLight();
    sun.position.set(40, 30, -24); sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
    wrap.setBand(sun, 0, 20);
    const source = new MeshStandardMaterial();
    expect(wrap.install(source)).toBe(true);
    // The board's own clone, hook and key and all.
    const clone = source.clone();
    clone.onBeforeCompile = source.onBeforeCompile;
    clone.customProgramCacheKey = source.customProgramCacheKey.bind(source);
    expect(wrap.install(clone)).toBe(false);
    const shader = compile(clone);
    expect(shader.fragmentShader.split('vec4 paintedWrapShadow(').length - 1).toBe(1);
    expect(shader.vertexShader.split('varying float vPaintedShadowX;').length - 1).toBe(1);
  });

  /**
   * The materials outlive the look. A look disposed and built again — an art
   * toggle, a new game — meets the frozen toon layers its predecessor patched,
   * and must neither patch them twice nor leave them reading a dead band.
   */
  it('hands a second look the same band, and re-wraps nothing', () => {
    const material = new MeshStandardMaterial();
    const sun = new DirectionalLight();
    sun.position.set(40, 30, -24); sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
    const first = createShadowWrap();
    first.setBand(sun, 0, 20);
    expect(first.install(material)).toBe(true);
    const shader = compile(material);
    const second = createShadowWrap();
    expect((second.uniforms.paintedShadowStep.value as Vector4).w).toBe(0);
    expect(second.install(material)).toBe(false);
    second.setBand(sun, 0, 20);
    // The shader compiled under the first look reads the second look's figures.
    expect(shader.uniforms.paintedShadowStep).toBe(second.uniforms.paintedShadowStep);
    expect((shader.uniforms.paintedShadowStep as { value: Vector4 }).value.w).toBe(1);
  });

  it('swaps both chunks and carries the world x it needs across', () => {
    const wrap = createShadowWrap();
    const material = new MeshStandardMaterial();
    const sun = new DirectionalLight();
    sun.position.set(40, 30, -24); sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
    wrap.setBand(sun, 0, 20);
    expect(wrap.install(material)).toBe(true);
    expect(wrap.install(material)).toBe(false);
    const shader = compile(material);
    expect(shader.fragmentShader).toContain('#include <painted_shadowmask_pars_fragment>');
    expect(shader.fragmentShader).toContain('#include <painted_lights_fragment_begin>');
    expect(shader.fragmentShader).not.toContain('#include <shadowmask_pars_fragment>');
    expect(shader.fragmentShader).not.toContain('#include <lights_fragment_begin>');
    expect(shader.fragmentShader).toContain('vec4 paintedWrapShadow(');
    expect(shader.vertexShader).toContain('varying float vPaintedShadowX;');
    expect(shader.vertexShader).toContain('vPaintedShadowX = worldPosition.x;');
    expect(shader.uniforms.paintedShadowStep).toBe(wrap.uniforms.paintedShadowStep);
    expect(shader.uniforms.paintedShadowBand).toBe(wrap.uniforms.paintedShadowBand);
  });
});

describe('the painted period wrap — the shear', () => {
  /** The rig the fit builds, in miniature: one sun, one ortho box over a band. */
  function rig(halfSpan: number, wideSpan: number, centre = 0, zRange: [number, number] = [-12, 12]) {
    const sun = new DirectionalLight();
    const [sx, sy, sz] = [2.35, 1.75, -1.4];
    const r = 200;
    sun.position.set(centre + r * sx, r * sy, r * sz);
    sun.target.position.set(centre, 0, 0);
    sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
    const camera = sun.shadow.camera;
    camera.position.copy(sun.position); camera.lookAt(sun.target.position); camera.updateMatrixWorld();
    const corners = (span: number): { min: Vector3; max: Vector3 } => {
      const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
      for (const x of [centre - span, centre + span]) for (const y of [-.5, 5]) for (const z of zRange) {
        const p = new Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        min.min(p); max.max(p);
      }
      return { min, max };
    };
    const box = corners(halfSpan), depth = corners(wideSpan);
    Object.assign(camera, {
      left: box.min.x - 2, right: box.max.x + 2, bottom: box.min.y - 2, top: box.max.y + 2,
      near: Math.max(.5, -depth.max.z - 3), far: -depth.min.z + 3,
    });
    camera.updateProjectionMatrix();
    sun.shadow.updateMatrices(sun);
    return { sun, matrix: sun.shadow.matrix.clone() };
  }

  it('is the shadow matrix’s own first column, times the period', () => {
    const period = 20;
    const { sun, matrix } = rig(period / 2 + 3, period * 1.5);
    const wrap = createShadowWrap();
    wrap.setBand(sun, 0, period);
    const step = wrap.uniforms.paintedShadowStep.value as Vector4;
    // What the shader subtracts must be exactly what a period of world x does
    // to a shadow coordinate — including the depth term, which is the half the
    // sun's x component makes non-zero.
    const here = new Vector4(3, 1, -2, 1).applyMatrix4(matrix);
    const east = new Vector4(3 + period, 1, -2, 1).applyMatrix4(matrix);
    expect(step.x).toBeCloseTo(east.x - here.x, 10);
    expect(step.y).toBeCloseTo(east.y - here.y, 10);
    expect(step.z).toBeCloseTo(east.z - here.z, 10);
    expect(step.w).toBe(1);
    expect(Math.abs(step.z)).toBeGreaterThan(1e-6);
  });

  it('goes to an identity the moment the fit spans all three copies again', () => {
    const { sun } = rig(30, 30);
    const wrap = createShadowWrap();
    wrap.setBand(sun, 0, 20);
    wrap.setBand(sun, 0, 0);
    expect((wrap.uniforms.paintedShadowStep.value as Vector4).w).toBe(0);
    expect(wrap.live).toBe(false);
  });

  /**
   * The brute force: a three-copy bake and a one-period bake of the same world,
   * read the way the two shaders read them, over a ground grid that spans all
   * three copies.
   *
   * The casters are vertical posts, periodic in x, rasterised into each map by
   * marching them; the term is three's own compare (`depth < coord.z − bias`).
   * Away from a shadow's edge the two must agree exactly. On an edge they may
   * not: the one-period map is roughly twice as fine, so its boundary sits at a
   * different sub-texel place — which is the whole of this change's visual
   * difference, and is measured here rather than asserted away.
   */
  it('reads the same shadow term as a three-copy bake, and the same on every copy', () => {
    const period = 20, margin = 3, size = 256, bias = 2e-4;
    const posts: { x: number; z: number; h: number }[] = [
      { x: -8, z: -3, h: 3 }, { x: -4, z: 3, h: 4 }, { x: -1, z: -6, h: 5 }, { x: 1, z: 2, h: 4.5 },
      { x: 4, z: 6, h: 3 }, { x: 5.5, z: -5, h: 2.5 }, { x: 8, z: 4, h: 3.5 }, { x: 9, z: -1, h: 5 },
    ];
    const one = rig(period / 2 + margin, period * 1.5);
    const wide = rig(period * 1.5, period * 1.5);
    const wrap = createShadowWrap();
    wrap.setBand(one.sun, 0, period);
    const step = wrap.uniforms.paintedShadowStep.value as Vector4;

    const bake = (matrix: Matrix4): Float32Array => {
      const depth = new Float32Array(size * size).fill(1);
      const point = new Vector4();
      for (const copy of [-1, 0, 1]) for (const post of posts) {
        // A post with a footprint: a bare line would let the ground between two
        // splats stay lit, and the reference has to be a solid occluder.
        for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) for (let t = 0; t <= 80; t++) {
          point.set(post.x + copy * period + a * .08, (post.h * t) / 80, post.z + b * .08, 1).applyMatrix4(matrix);
          const u = point.x, v = point.y, d = point.z;
          if (u < 0 || u >= 1 || v < 0 || v >= 1 || d < 0 || d > 1) continue;
          const cell = Math.floor(v * size) * size + Math.floor(u * size);
          if (d < depth[cell]!) depth[cell] = d;
        }
      }
      return depth;
    };
    const oneMap = bake(one.matrix), wideMap = bake(wide.matrix);

    const read = (map: Float32Array, coord: Vector4): number => {
      if (coord.x < 0 || coord.x >= 1 || coord.y < 0 || coord.y >= 1 || coord.z > 1) return 1;
      const cell = Math.floor(coord.y * size) * size + Math.floor(coord.x * size);
      return map[cell]! < coord.z - bias ? 0 : 1;
    };

    // The ground, across all three copies.
    const across = 150, down = 40;
    const reference: number[] = [], wrapped: number[] = [], canonical: number[] = [];
    const coord = new Vector4();
    for (let j = 0; j < down; j++) for (let i = 0; i < across; i++) {
      const x = -period * 1.5 + (3 * period * i) / (across - 1);
      const z = -8 + (16 * j) / (down - 1);
      reference.push(read(wideMap, coord.set(x, 0, z, 1).applyMatrix4(wide.matrix)));
      coord.set(x, 0, z, 1).applyMatrix4(one.matrix);
      const copy = Math.floor((x - 0) / period + .5);
      coord.set(coord.x - copy * step.x, coord.y - copy * step.y, coord.z - copy * step.z, coord.w);
      wrapped.push(read(oneMap, coord));
      // The same ground brought home by hand: what the canonical copy reads.
      canonical.push(read(oneMap, coord.set(x - copy * period, 0, z, 1).applyMatrix4(one.matrix)));
    }

    // Something is actually in shadow, or the agreement below is vacuous.
    const shaded = reference.filter(v => v === 0).length;
    expect(shaded).toBeGreaterThan(reference.length * .05);

    // The wrap is exact: a wrap copy reads what its canonical twin reads. This
    // is the property the three-copy bake never had — its map is not period
    // aligned, so each copy samples its own texels.
    expect(wrapped).toEqual(canonical);

    // And against the three-copy bake: identical away from an edge, and the
    // disagreements that remain are all on one.
    let interior = 0, interiorAgreed = 0, agreed = 0;
    for (let j = 0; j < down; j++) for (let i = 0; i < across; i++) {
      const at = j * across + i;
      if (reference[at] === wrapped[at]) agreed++;
      // "Interior" is two samples clear of a boundary, not one: a sample of this
      // grid is coarser than a texel of either map, so a neighbour that agrees
      // is not yet proof that the edge is further off than the finer map's own
      // texel. Two is.
      const reach = 2;
      if (i < reach || j < reach || i >= across - reach || j >= down - reach) continue;
      let edge = false;
      for (let dj = -reach; dj <= reach; dj++) for (let di = -reach; di <= reach; di++) {
        if (reference[(j + dj) * across + i + di] !== reference[at]) edge = true;
      }
      if (edge) continue;
      interior++;
      if (reference[at] === wrapped[at]) interiorAgreed++;
    }
    expect(interior).toBeGreaterThan(reference.length * .3);
    expect(interiorAgreed).toBe(interior);
    expect(agreed / reference.length).toBeGreaterThan(.97);
  });
});

describe('the painted period wrap — where it is wired in', () => {
  it('is swept from the static bake alone, and the fit is its only band', () => {
    const shadows = readFileSync(new URL('../../src/render3d/paintedShadows.js', import.meta.url), 'utf8');
    // The sweep belongs to the sun's own arm: the counters' map follows the
    // camera and never wraps, and a sweep on its arm would recompile the board
    // on every walking piece.
    const sunArm = shadows.slice(shadows.indexOf('if (lights.includes(sun)'), shadows.indexOf('if (lights.includes(counters)'));
    expect(sunArm).toContain('wrap?.sweep(scene)');
    expect(shadows.slice(shadows.indexOf('if (lights.includes(counters)'))).not.toContain('wrap');

    const look = readFileSync(new URL('../../src/render3d/paintedLook.js', import.meta.url), 'utf8');
    const fit = look.slice(look.indexOf('function fitShadows'), look.indexOf('function invalidateShadows'));
    expect(fit).toContain('shadowKnobs.periodFit');
    expect(fit).toContain('shadowKnobs.periodMargin');
    expect(fit).toContain('shadowWrap.setBand(');
    // One writer, so a fit and a lookup can never disagree about the band.
    expect(look.split('setBand(').length - 1).toBe(1);
    // Near and far are the three-copy figures whichever fit is in force —
    // `shadow.bias` is a figure in projected depth and must not move with the box.
    expect(fit).toContain('near:Math.max(.5,-depth.max.z-3),far:-depth.min.z+3');
    expect(fit).toContain('const depth=corners(wide,new T.Box3())');
    // The knob off is the three-copy fit to the digit: the same corner
    // expression as before, and the same Box3 object for the box and the depth.
    expect(fit).toContain('const wide=[bounds.minX-period-2,bounds.maxX+period+2]');
    expect(fit).toContain('const box=oneBand?corners(fitted,new T.Box3()):depth;');
  });
});
