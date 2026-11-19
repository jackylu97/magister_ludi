/**
 * The ground paint texture (`groundPaint.js`; stages 1 and 2 of
 * `docs/plans/ground-paint-texture-2026-11-18.md`).
 *
 * Below a zoom threshold the board draws a plain land (the hex grid and the
 * hill mounds, no brush patch cut in) that reads its paint from one texture,
 * in place of the present far land. These tests pin the plan (the density, the
 * byte budget, the GPU's limit and the fall back to the far land), the board's
 * two lands and their switch, what play changes on the plain land (the hill
 * relief, the fog, the clearing), the bake's steps, and the trip through the
 * board workers.
 */
import { expectSameArray } from './geometryArrayHelpers';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BoxGeometry, type BufferAttribute, BufferGeometry, Color, Float32BufferAttribute, InstancedMesh, Mesh, MeshStandardMaterial, Raycaster,
  type Texture, Vector3, type WebGLRenderTarget, type Scene,
} from 'three';
import { buildPaintedBoard, type PaintedBoard, type PaintedBoardBatch, type PaintedBoardMaterials, type PaintedVegetationAssets } from '../../src/render3d/paintedBoard.js';
import { createGroundPaint, groundPaintBox, groundPaintEntries, groundPaintPlan, groundPaintSquares, type GroundPaintPlan } from '../../src/render3d/groundPaint.js';
import { packPaintedBatches, packPaintedKit, unpackPaintedBatches, unpackPaintedKit } from '../../src/render3d/paintedBoardTransfer.js';
import { buildPaintedBoardAsync } from '../../src/render3d/paintedBoardAsync.js';
import { CloseGroundPaint } from '../../src/render3d/closeGroundPaint';
import { VIEW3D } from '../../src/render3d/lookData';
import { createMap } from '../../src/sim/map';
// @ts-expect-error The terrain study's painter is JavaScript.
import { createTerrainPainter } from '../../src/terrainStudy/terrainPigment.js';
// @ts-expect-error The terrain study's ranges are JavaScript.
import { createMountainRanges } from '../../src/terrainStudy/mountainRanges.js';
// @ts-expect-error Shared study surface helpers are JavaScript.
import { centre, prepareTerrainMap } from '../../src/terrainStudy/surface.js';

const GROUND = VIEW3D.painted.groundTexture, LOD = VIEW3D.painted.lod;
const owned: { dispose(): void }[] = [];
afterEach(() => { owned.splice(0).forEach(item => item.dispose()); });

/** A small board with hills, a lake, forest and plains; the same fixture the upload test uses. */
function fixture(width = 12, height = 4) {
  const map = createMap({ width, height, terrain: 'grassland' });
  map.tiles.forEach((tile, i) => {
    if (i % 5 === 0) tile.feature = 'forest';
    else if (i % 5 === 1) tile.hills = true;
    else if (i % 5 === 2) tile.terrain = 'lake';
    else if (i % 5 === 3) tile.terrain = 'plains';
  });
  const mat = (color = '#799741'): MeshStandardMaterial => { const m = new MeshStandardMaterial({ color, vertexColors: true }); owned.push(m); return m; };
  const materials: PaintedBoardMaterials = {
    ground: Object.fromEntries(['grassland', 'plains', 'desert', 'tundra', 'snow', 'mountain', 'ocean', 'coast', 'lake', 'oasis', 'floodplain'].map(k => [k, mat()])),
    earth: mat(), mergedLand: mat('#ffffff'), mergedWater: mat('#ffffff'), mergedDetails: mat('#ffffff'),
    water: { river: mat(), bank: mat(), shallows: mat(), foam: mat() },
    features: { shrub: mat(), stone: mat(), fertile: mat(), bank: mat(), pool: mat(), shallow: mat(), reeds: mat() },
  };
  const geometry = new BoxGeometry(0.3, 0.8, 0.3); owned.push(geometry);
  const asset = { geometry, shoulderGeometry: geometry, material: mat() };
  const assets: PaintedVegetationAssets = { broadleaves: [asset, asset, asset], cypresses: [asset, asset], escarpments: [asset, asset, asset], limestone: asset, broadleaf: asset, rangeMaterial: mat() };
  const plan = groundPaintPlan(map.width, map.height, 16384)!;
  const build = (ground: GroundPaintPlan | null = plan) => {
    const board = buildPaintedBoard(map, assets, materials, true, null, undefined, null, null, null, ground);
    owned.push(board);
    return board;
  };
  return { map, assets, materials, plan, build };
}

function meshes(board: PaintedBoard, copy = 1): Mesh[] {
  return board.copies[copy]!.children.filter((object): object is Mesh => object instanceof Mesh && !(object instanceof InstancedMesh));
}
const family = (board: PaintedBoard, name: string) => meshes(board).filter(mesh => mesh.userData['paintedFamily'] === name);
const cutLand = (board: PaintedBoard) => family(board, 'merged land').filter(mesh => mesh.userData['paintedSurface']);
const plainLand = (board: PaintedBoard) => family(board, 'plain land');
const triangles = (list: Mesh[]) => list.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0);
/** Compare the attribute order, index and exact bytes without formatting each number as text. */
function expectSameGeometry(actual: BufferGeometry, expected: BufferGeometry): void {
  const attributes = Object.keys(expected.attributes);
  expect(Object.keys(actual.attributes)).toEqual(attributes);
  for (const name of attributes) {
    expectSameArray(actual.getAttribute(name).array, expected.getAttribute(name).array, name);
  }
  expect(actual.index === null).toBe(expected.index === null);
  if (actual.index && expected.index) expectSameArray(actual.index.array, expected.index.array, 'index');
}

/**
 * A renderer that records what the bake draws: which target, how many meshes,
 * and whether the texture asked for its mipmaps at that render. Nothing is
 * drawn; drawing a stand-in is what would upload it.
 */
function fakeRenderer(maxTextureSize = 16384) {
  let bound: WebGLRenderTarget | null = null, clear = new Color(0x123456), alpha = 1;
  const renders: { target: WebGLRenderTarget | null; meshes: number; mipmaps: boolean | null; geometries: BufferGeometry[] }[] = [];
  // The copy goes through WebGL and three's state record (`copySquare`): a texture's handle is the texture itself here.
  const copies: { from: Texture | null; to: Texture | null; width: number; height: number; x: number; y: number }[] = [];
  let read: Texture | null = null, boundTexture: Texture | null = null;
  const gl = {
    READ_FRAMEBUFFER: 1, COLOR_ATTACHMENT0: 2, TEXTURE_2D: 3,
    createFramebuffer: () => ({}), deleteFramebuffer: () => undefined,
    framebufferTexture2D(_target: number, _attachment: number, _type: number, texture: Texture) { read = texture; },
    copyTexSubImage2D(_type: number, _level: number, x: number, y: number, _sx: number, _sy: number, width: number, height: number) {
      copies.push({ from: read, to: boundTexture, width, height, x, y });
    },
  };
  const renderer = {
    compile: vi.fn(),
    compileAsync: vi.fn(),
    getContext: () => gl,
    properties: { get: (texture: Texture) => ({ __webglTexture: texture }) },
    state: {
      bindFramebuffer: () => true,
      bindTexture(_type: number, texture: Texture) { boundTexture = texture; },
      unbindTexture() { boundTexture = null; },
    },
    autoClear: true,
    capabilities: { maxTextureSize, getMaxAnisotropy: () => 16 },
    getRenderTarget: () => bound,
    setRenderTarget(target: WebGLRenderTarget | null) { bound = target; },
    getClearColor: (out: Color) => out.copy(clear), getClearAlpha: () => alpha,
    setClearColor(color: number | Color, a = 1) { clear = new Color(color); alpha = a; },
    clear() { /* nothing to clear */ },
    render(scene: Scene) {
      const geometries: BufferGeometry[] = [];
      scene.traverse(object => { if (object instanceof Mesh) geometries.push(object.geometry); });
      renders.push({ target: bound, meshes: geometries.length, mipmaps: bound ? bound.texture.generateMipmaps : null, geometries });
    },
  };
  return { renderer, renders, copies, bound: () => bound, clear: () => clear };
}
type FakeRenderer = ReturnType<typeof fakeRenderer>['renderer'];
const step = (board: PaintedBoard, renderer: FakeRenderer) => board.groundPaint!.step(renderer as never);
/** Steps until the bake is done; returns how many steps it took. */
function bake(board: PaintedBoard, renderer: FakeRenderer): number {
  let steps = 0;
  while (board.groundPaint!.pending && steps < 1000) { steps++; if (step(board, renderer)) break; }
  return steps;
}

describe('the plan', () => {
  const standard = { width: 80, height: 52 }, giant = { width: 180, height: 112 };

  it('gives the standard map the sheet\'s density and band, at about 60 MB', () => {
    const plan = groundPaintPlan(standard.width, standard.height, 16384)!;
    expect(plan.plain).toBe(true);
    expect(plan.density).toBe(GROUND.texelsPerUnit);
    expect([plan.width, plan.height]).toEqual([4434, 2528]);
    expect(plan.bytes / 1e6).toBeCloseTo(59.8, 1);
    expect([plan.nearPixels, plan.farPixels]).toEqual([GROUND.nearPixels, GROUND.farPixels]);
    expect(plan.limitedBy).toBeNull();
  });

  it('lowers the Giant map\'s density to the byte budget, and its band with it', () => {
    const plan = groundPaintPlan(giant.width, giant.height, 16384)!;
    expect(plan.limitedBy).toBe('budget');
    expect(plan.bytes).toBeLessThanOrEqual(GROUND.budgetMiB * 1048576);
    expect(plan.bytes).toBeGreaterThan(GROUND.budgetMiB * 1048576 * .99);
    expect(plan.nearPixels / GROUND.nearPixels).toBeCloseTo(plan.density / GROUND.texelsPerUnit, 9);
    expect(plan.plain).toBe(true);
    expect(Math.max(plan.width, plan.height)).toBeLessThanOrEqual(16384);
  });

  it('keeps under the GPU\'s largest texture: 64 texels a unit on the Giant map would be wider than 16,384', () => {
    const sheet = { enabled: true, texelsPerUnit: 64, budgetMiB: 4096, nearPixels: GROUND.nearPixels, farPixels: GROUND.farPixels };
    expect(groundPaintBox(giant.width, giant.height).period * 64).toBeGreaterThan(16384);
    const plan = groundPaintPlan(giant.width, giant.height, 16384, sheet)!;
    expect(plan.limitedBy).toBe('gpu');
    expect(plan.width).toBeLessThanOrEqual(16384);
    expect(plan.density).toBeCloseTo(16384 / plan.period, 9);
  });

  it('falls back to the present far land when the band could no longer cover the far detail band', () => {
    // A GPU whose largest texture is 2048 still gets a plain land on the standard map, at a lower band.
    const small = groundPaintPlan(standard.width, standard.height, 2048)!;
    expect(small.plain).toBe(true);
    expect(small.nearPixels).toBeGreaterThanOrEqual(LOD.farPixels);
    // One of 1024 does not: the plain land would start below the far band.
    const tiny = groundPaintPlan(standard.width, standard.height, 1024)!;
    expect(tiny.plain).toBe(false);
    expect(tiny.reason).toBe('gpu');
    // Nor does a budget of 4 MiB.
    const poor = groundPaintPlan(standard.width, standard.height, 16384, { ...GROUND, budgetMiB: 4 })!;
    expect(poor.plain).toBe(false);
    expect(poor.reason).toBe('budget');
  });

  it('is off with its switch', () => {
    expect(groundPaintPlan(standard.width, standard.height, 16384, { ...GROUND, enabled: false })).toBeNull();
  });

  it('cuts the texture into squares that cover it, bottom row first', () => {
    const squares = groundPaintSquares(4434, 2528, 1024);
    expect(squares).toHaveLength(15);
    expect(squares[0]).toEqual([0, 0]);
    expect(squares[5]).toEqual([0, 1024]);
    expect(squares[squares.length - 1]).toEqual([4096, 2048]);
  });
});

describe('the board with a plain land', () => {
  it('keeps the cut land byte for byte, and builds a plain land in place of the far land', () => {
    const { build } = fixture();
    const before = build(null), after = build();
    const batches = (board: PaintedBoard) => board.exportBatches();
    const land = (list: PaintedBoardBatch[], detail: string) => list.filter(batch => !batch.matrix && batch.detail === detail && batch.geometry.hasAttribute('turfWeight'));
    // The cut land is the present near land under another band name, and it is still what the pointer picks.
    const near = land(batches(before), 'near'), cut = land(batches(after), 'cut');
    expect(cut.length).toBe(near.length);
    cut.forEach((batch, i) => expectSameGeometry(batch.geometry, near[i]!.geometry));
    expect(after.pickMeshes).toHaveLength(before.pickMeshes.length);
    after.pickMeshes.forEach((mesh, i) => expectSameGeometry(mesh.geometry, before.pickMeshes[i]!.geometry));
    // No far land: the plain land, one batch for each cut land chunk.
    expect(land(batches(after), 'far')).toHaveLength(0);
    expect(land(batches(after), 'plain')).toHaveLength(cut.length);
    // The props keep their bands.
    const props = (board: PaintedBoard) => batches(board).filter(batch => batch.matrix).map(batch => `${batch.detail}:${batch.count}`);
    expect(props(after)).toEqual(props(before));
    // The plain land has no patch cut in, so it has fewer triangles, and it casts nothing.
    expect(triangles(plainLand(after))).toBeLessThan(triangles(cutLand(after)));
    for (const batch of land(batches(after), 'plain')) expect(batch.castShadow).toBe(false);
    for (const batch of cut) expect(batch.castShadow).toBe(true);
  });

  it('marks the faces that read the texture, and never lets a face cross a hex edge', () => {
    const { build } = fixture();
    const board = build();
    let marked = 0, own = 0;
    for (const mesh of plainLand(board)) {
      const color = mesh.geometry.getAttribute('color'), cell = mesh.geometry.getAttribute('paintedCell'), index = mesh.geometry.index!;
      for (let i = 0; i < index.count; i += 3) {
        const [a, b, c] = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
        // The fog reads one cell a vertex, so a face that crossed a hex edge would be fogged by two hexes.
        expect(cell.getX(b)).toBe(cell.getX(a)); expect(cell.getX(c)).toBe(cell.getX(a));
        if (color.getX(a) > 1.5) marked++; else own++;
      }
    }
    expect(marked).toBeGreaterThan(0);
    // The turf and a crease keep their own colour.
    expect(own).toBeGreaterThan(0);
  });

  it('reads the texture on a hill of the hex\'s own ground, and keeps the colour of a hill that reaches over from another ground', () => {
    // A grassland hex: one flat face, then two gentle hill faces, the first of a grassland hill and the second of a
    // plains hill that reaches over from a neighbour (`hillMounds.js` gives a hill its owner's ground).
    const map = createMap({ width: 6, height: 4, terrain: 'grassland' });
    const renderMap = prepareTerrainMap(map, { wrap: true });
    const painter = createTerrainPainter(renderMap, createMountainRanges(renderMap));
    const tile = renderMap.tiles[8]!, c = centre(tile);
    // Facing up, and gentle, so a hill face is not bare rock.
    const face = (y: number) => [c.x, y, c.z, c.x, y + .01, c.z + .1, c.x + .1, y, c.z];
    const geometry = () => {
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute([...face(.1), ...face(.12), ...face(.14)], 3));
      g.computeVertexNormals();
      g.userData['plateVertexCount'] = 3;
      g.userData['moundPigments'] = [{ end: 6, kind: 'grassland' }, { end: 9, kind: 'plains' }];
      owned.push(g);
      return g;
    };
    const plain = geometry(), cut = geometry();
    painter.paint(plain, tile, false, true); painter.paint(cut, tile, false, false);
    const reds = (g: BufferGeometry) => Array.from({ length: g.getAttribute('position').count }, (_, i) => g.getAttribute('color').getX(i));
    const marked = (g: BufferGeometry) => reds(g).map(red => red > 1.5);
    // The flat face and the grassland hill read the texture; the plains hill keeps its colour, cut as on the cut land.
    const out = marked(plain);
    expect(out.slice(0, 6).every(Boolean)).toBe(true);
    expect(out.slice(6).some(Boolean)).toBe(false);
    const own = (g: BufferGeometry, from: number) => Array.from({ length: g.getAttribute('position').count - from }, (_, i) => [0, 1, 2].map(k => g.getAttribute('color').getComponent(from + i, k)));
    const plainsAt = (g: BufferGeometry) => g.getAttribute('position').count - 3;
    expect(own(plain, plainsAt(plain))).toEqual(own(cut, plainsAt(cut)));
  });

  it('wears the plain land\'s material, with the fog on it, and the cut land the land\'s own', () => {
    const { build, materials } = fixture();
    const board = build();
    const plain = plainLand(board)[0]!.material as MeshStandardMaterial, cut = cutLand(board)[0]!.material as MeshStandardMaterial;
    expect(plain.customProgramCacheKey()).toContain(':ground-paint');
    expect(plain.customProgramCacheKey()).toContain(':painted-fog');
    expect(cut.customProgramCacheKey()).not.toContain(':ground-paint');
    // The three wrap copies share the one material, so they share the one texture.
    expect(new Set([0, 1, 2].map(copy => plainLand(board).length && family(board, 'plain land').length && meshes(board, copy).find(mesh => mesh.userData['paintedFamily'] === 'plain land')!.material)).size).toBe(1);
    expect(plain).not.toBe(materials.mergedLand);
  });

  it('draws the cut land until the texture is baked, then the plain land below its band', () => {
    const { build } = fixture();
    const board = build(), { renderer } = fakeRenderer();
    board.applyFog(null);
    const drawn = (list: Mesh[]) => list.every(mesh => mesh.visible);
    const hidden = (list: Mesh[]) => list.every(mesh => !mesh.visible);
    const plain = board.groundPaint!;
    board.updateDetail(plain.nearPixels - 1);
    expect(plain.ready).toBe(false);
    expect(drawn(cutLand(board))).toBe(true); expect(hidden(plainLand(board))).toBe(true);
    expect(bake(board, renderer)).toBeGreaterThan(1);
    expect(plain.ready).toBe(true); expect(plain.drawn).toBe(true);
    expect(hidden(cutLand(board))).toBe(true); expect(drawn(plainLand(board))).toBe(true);
    // The band: kept up to `farPixels`, given up above it, and taken again only below `nearPixels`.
    board.updateDetail((plain.nearPixels + plain.farPixels) / 2);
    expect(plain.drawn).toBe(true);
    board.updateDetail(plain.farPixels + 1);
    expect(plain.drawn).toBe(false); expect(drawn(cutLand(board))).toBe(true); expect(hidden(plainLand(board))).toBe(true);
    board.updateDetail((plain.nearPixels + plain.farPixels) / 2);
    expect(plain.drawn).toBe(false);
    board.updateDetail(plain.nearPixels - 1);
    expect(plain.drawn).toBe(true);
  });

  it('agrees with the far detail band: the far props stand on the plain land, the near props on either', () => {
    const { build } = fixture();
    const board = build(), { renderer } = fakeRenderer();
    board.applyFog(null); bake(board, renderer);
    const propsFar = () => board.copies[1]!.children.some(object => object instanceof InstancedMesh && object.visible && !object.castShadow);
    board.updateDetail(LOD.nearPixels - 1);
    expect(board.groundPaint!.drawn).toBe(true);
    expect(propsFar()).toBe(true);
    board.updateDetail((LOD.farPixels + board.groundPaint!.nearPixels) / 2);
    expect(board.groundPaint!.drawn).toBe(true);
    expect(propsFar()).toBe(false);
    expect(board.groundPaint!.nearPixels).toBeGreaterThanOrEqual(LOD.farPixels);
  });

  it('raises the cut land for the static sun\'s bake and puts the plain land back after it', () => {
    const { build } = fixture();
    const board = build(), { renderer } = fakeRenderer();
    board.applyFog(null); bake(board, renderer);
    board.updateDetail(10);
    expect(board.setBakeDetail(true)).toBe(true);
    expect(cutLand(board).every(mesh => mesh.visible && mesh.castShadow)).toBe(true);
    expect(plainLand(board).every(mesh => !mesh.visible)).toBe(true);
    expect(board.setBakeDetail(false)).toBe(true);
    expect(plainLand(board).every(mesh => mesh.visible)).toBe(true);
  });
});

describe('play on the plain land', () => {
  it('takes a hill away under a town and gives it back, as the cut land does', () => {
    const { build, map } = fixture();
    const board = build(), cell = map.tiles.findIndex(tile => tile.hills);
    const saved = plainLand(board).map(mesh => Array.from(mesh.geometry.index!.array));
    expect(board.replaceHillRelief(new Set([cell]))).toBe(true);
    let removed = 0;
    for (const [n, mesh] of plainLand(board).entries()) {
      const index = mesh.geometry.index!, relief = mesh.geometry.getAttribute('paintedRelief'), owner = mesh.geometry.getAttribute('paintedCell');
      for (let i = 0; i < index.count; i += 3) {
        const a = saved[n]![i]!;
        if (relief.getX(a) && owner.getX(a) === cell) { expect(index.getX(i + 1)).toBe(a); expect(index.getX(i + 2)).toBe(a); removed++; }
        else expect([index.getX(i), index.getX(i + 1), index.getX(i + 2)]).toEqual(saved[n]!.slice(i, i + 3));
      }
    }
    expect(removed).toBeGreaterThan(0);
    expect(board.replaceHillRelief(new Set())).toBe(true);
    plainLand(board).forEach((mesh, n) => expect(Array.from(mesh.geometry.index!.array)).toEqual(saved[n]));
  });

  it('is charted, remembered and hidden by the fog chunk by chunk, as the cut land is', () => {
    const { build, map } = fixture(24, 2);
    const board = build(), { renderer } = fakeRenderer();
    bake(board, renderer); board.updateDetail(10);
    expect(plainLand(board).some(mesh => mesh.visible)).toBe(false);
    const levels = new Uint8Array(map.tiles.length); levels[0] = 1;
    board.applyFog(levels);
    const shown = plainLand(board).filter(mesh => mesh.visible);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(plainLand(board).length);
    for (const mesh of shown) expect(Array.from(mesh.geometry.getAttribute('paintedCell').array)).toContain(0);
    // The register is the board's one fog texture, which every land reads: a hex going from remembered to visible,
    // and the clearing under a town, are texel writes that no land's geometry hears about.
    const texels = Array.from(board.fogTexture.image.data as Uint8Array);
    levels[0] = 2; board.applyFog(levels);
    expect(Array.from(board.fogTexture.image.data as Uint8Array)).not.toEqual(texels);
    expect(board.suppressTile(0, 2)).toBe(true);
    expect(plainLand(board).filter(mesh => mesh.visible)).toEqual(shown);
    board.applyFog([]);
    expect(plainLand(board).some(mesh => mesh.visible)).toBe(false);
  });

  it('has the cut land\'s surface, so a piece stands at the same height on either', () => {
    const { build } = fixture();
    const board = build(), ray = new Raycaster();
    const height = (list: Mesh[], x: number, z: number) => {
      ray.set(new Vector3(x, 5, z), new Vector3(0, -1, 0));
      return ray.intersectObjects(list, false)[0]?.point.y ?? null;
    };
    const cut = cutLand(board), plain = plainLand(board);
    for (const mesh of [...cut, ...plain]) mesh.updateMatrixWorld(true);
    let compared = 0;
    for (let x = .3; x < board.wrapWidth - 1; x += .61) for (let z = .2; z < 4.4; z += .53) {
      const a = height(cut, x, z), b = height(plain, x, z);
      if (a === null || b === null) continue;
      expect(Math.abs(a - b)).toBeLessThan(2e-3);
      compared++;
    }
    expect(compared).toBeGreaterThan(50);
  });
});

describe('the bake', () => {
  it('keeps the cut mesh while a local texture loads and restores the base texture after zooming out', () => {
    const { build, plan } = fixture();
    const board = build({ ...plan, closeTrial: true });
    const ground = board.groundPaint!;
    const { renderer } = fakeRenderer();
    bake(board, renderer);
    const base = ground.texture;
    const trial = ground.trial!;
    const local = trial.bakeClose({ ...plan, x0: -2, period: 4, wrapPeriod: plan.period, width: 256 });
    owned.push(local.paint);
    board.updateDetail(250);
    trial.show(local.paint);
    expect(ground.drawn).toBe(false);
    for (let i = 0; i < 100 && local.paint.pending; i++) local.step(renderer as never);
    expect(local.paint.ready).toBe(true);
    trial.show(local.paint);
    expect(ground.drawn).toBe(true);
    expect(ground.texture).toBe(local.paint.uniforms.groundPaintMap.value);
    trial.show(null);
    expect(ground.drawn).toBe(false);
    board.updateDetail(0);
    trial.show();
    expect(ground.drawn).toBe(true);
    expect(ground.texture).toBe(base);
  });

  it('reuses a covered texture across the seam and draws cut land after a jump', () => {
    const { build, plan } = fixture(32, 4);
    const board = build({ ...plan, closeTrial: true });
    const ground = board.groundPaint!;
    const { renderer } = fakeRenderer();
    bake(board, renderer);
    const close = new CloseGroundPaint(plan, ground.trial!, [0, 1]);
    owned.push(close);
    const move = (x: number) => close.update(renderer as never, x, 3, 7, 5, 50, true);
    const finishAt = (x: number) => {
      for (let i = 0; i < 100 && close.pending; i++) move(x);
      expect(close.mode).toBe('close');
    };
    move(plan.period - 1);
    expect(close.mode).toBe('cut');
    finishAt(plan.period - 1);
    const first = ground.texture;
    move(0);
    expect(close.pending).toBe(false);
    expect(ground.texture).toBe(first);
    move(2);
    expect(close.pending).toBe(true);
    expect(ground.texture).toBe(first);
    expect(close.bytes).toBe(24 * 1048576);
    move(16);
    expect(close.mode).toBe('cut');
    expect(ground.drawn).toBe(false);
    finishAt(16);
    expect(close.bytes).toBe(12 * 1048576);
    board.setBakeDetail(true);
    expect(ground.drawn).toBe(false);
    board.setBakeDetail(false);
    expect(ground.drawn).toBe(true);
  });

  it('draws one square a step, uploads land nobody has drawn through stand-ins, and makes the mipmaps once', () => {
    const { build } = fixture();
    const board = build(), { renderer, renders, copies, bound, clear } = fakeRenderer();
    const lands = cutLand(board);
    // One land already on the GPU: its colours were released at its upload, so the bake draws it as it is.
    const color = lands[0]!.geometry.getAttribute('color') as BufferAttribute;
    color.onUploadCallback();
    if (color.array) (color as unknown as { array: null }).array = null;
    const arrays = lands.slice(1).map(mesh => mesh.geometry.getAttribute('color').array);
    renderer.setClearColor(0x445566, .5); renderer.autoClear = true;
    const steps = bake(board, renderer);
    const info = board.groundPaint!.info!;
    expect(info.steps).toBe(steps);
    expect(info.drawn + info.skipped).toBe(info.squares);
    // Every step puts the renderer back as it found it.
    expect(bound()).toBeNull(); expect(renderer.autoClear).toBe(true); expect(clear().getHex()).toBe(0x445566);
    // The squares draw into the MSAA square, and the GPU copies each once into the texture, cut to the texture's edge.
    const texture = board.groundPaint!.texture!, plan = board.groundPaint!.plan;
    expect(copies).toHaveLength(info.drawn);
    for (const copy of copies) {
      expect(copy.to).toBe(texture);
      expect(copy.x + copy.width).toBeLessThanOrEqual(plan.width);
      expect(copy.y + copy.height).toBeLessThanOrEqual(plan.height);
    }
    // The mipmaps: asked for once, by the one render into the texture, which draws nothing.
    const intoTexture = renders.filter(render => render.target?.texture === texture);
    expect(intoTexture).toHaveLength(1);
    expect(intoTexture[0]!.mipmaps).toBe(true);
    expect(intoTexture[0]!.meshes).toBe(0);
    // The uploaded land is drawn itself; the others through stand-ins, which leave the board's own arrays alone.
    const drawnGeometries = new Set(renders.flatMap(render => render.geometries));
    expect(drawnGeometries.has(lands[0]!.geometry)).toBe(true);
    for (const mesh of lands.slice(1)) expect(drawnGeometries.has(mesh.geometry)).toBe(false);
    lands.slice(1).forEach((mesh, i) => expect(mesh.geometry.getAttribute('color').array).toBe(arrays[i]));
    expect(board.groundPaint!.ready).toBe(true);
    expect(step(board, renderer)).toBe(false);
  });

  it('uses its program once before the board\'s first frame, so no step does', () => {
    const { build } = fixture();
    const board = build(), { renderer, renders } = fakeRenderer();
    board.groundPaint!.prepare(renderer as never);
    expect(renderer.compile).toHaveBeenCalledTimes(1);
    expect(renderer.compileAsync).not.toHaveBeenCalled();
    expect(renders).toHaveLength(0);
    board.groundPaint!.prime(renderer as never);
    // One draw of one degenerate face into each kind of target the bake draws into: the texel nobody reads, and the square.
    expect(renders.map(render => [render.target!.width, render.meshes])).toEqual([[1, 1], [GROUND.bakeSquare, 1]]);
    board.groundPaint!.prime(renderer as never);
    expect(renders).toHaveLength(2);
    // The first step clears the texture and draws nothing.
    step(board, renderer);
    expect(renders).toHaveLength(2);
    expect(bake(board, renderer)).toBeGreaterThan(1);
    expect(board.groundPaint!.ready).toBe(true);
  });

  it('puts the charted plain land on the GPU before it is first drawn, and nothing else', () => {
    const { build, map } = fixture(24, 2);
    const board = build(), { renderer, renders } = fakeRenderer();
    const levels = new Uint8Array(map.tiles.length); levels[0] = 2;
    board.applyFog(levels);
    const charted = plainLand(board).filter(mesh => Array.from(mesh.geometry.getAttribute('paintedCell').array).includes(0));
    expect(charted.length).toBeGreaterThan(0);
    expect(charted.length).toBeLessThan(plainLand(board).length);
    bake(board, renderer);
    const drawn = new Set(renders.flatMap(render => render.geometries));
    for (const mesh of plainLand(board)) expect(drawn.has(mesh.geometry)).toBe(charted.includes(mesh));
  });

  it('uses the plain land\'s program in the board\'s first frame, drawing no colour and no depth, and puts it back', () => {
    const { build } = fixture();
    const board = build(), { renderer } = fakeRenderer();
    board.applyFog(null); board.updateDetail(1e6);
    const plain = plainLand(board), material = plain[0]!.material as MeshStandardMaterial;
    expect(plain.some(mesh => mesh.visible)).toBe(false);
    board.groundPaint!.primeLand(true);
    expect(plain.filter(mesh => mesh.visible)).toHaveLength(1);
    expect([material.colorWrite, material.depthWrite]).toEqual([false, false]);
    board.groundPaint!.primeLand(false);
    expect(plain.some(mesh => mesh.visible)).toBe(false);
    expect([material.colorWrite, material.depthWrite]).toEqual([true, true]);
    // Once the plain land is drawn anyway, it changes nothing that is seen.
    bake(board, renderer); board.updateDetail(1);
    board.groundPaint!.primeLand(true); board.groundPaint!.primeLand(false);
    expect(plain.every(mesh => mesh.visible)).toBe(true);
    expect([material.colorWrite, material.depthWrite]).toEqual([true, true]);
  });

  it('puts no more than a step\'s worth of land on the GPU in one step', () => {
    const { build } = fixture(24, 6);
    const board = build(), { renderer, renders } = fakeRenderer();
    const budget = GROUND.bakeStepMiB * 1048576;
    let before = renders.length;
    while (board.groundPaint!.pending) {
      step(board, renderer);
      const fresh = renders.slice(before); before = renders.length;
      const uploads = fresh.filter(render => render.target && render.target.width === 1);
      for (const render of uploads) {
        const bytes = render.geometries.reduce((sum, geometry) => sum + Object.values(geometry.attributes).reduce((s, a) => s + (a.array as ArrayLike<number> & { byteLength: number }).byteLength, geometry.index?.array.byteLength ?? 0), 0);
        if (render.geometries.length > 1) expect(bytes).toBeLessThanOrEqual(budget);
      }
      expect(uploads.length).toBeLessThanOrEqual(1);
    }
  });

  it('finds the land of a square at each of the three wrap offsets', () => {
    const { build } = fixture();
    const board = build(), plan = board.groundPaint!.plan;
    const lands = cutLand(board);
    // A square over the map's left edge reaches the last columns through the copy one period to the left.
    const edge = groundPaintEntries(lands, { x0: plan.x0, x1: plan.x0 + .5, z0: 0, z1: 3 }, plan.period);
    expect(edge.some(entry => entry.offset === -plan.period)).toBe(true);
    const middle = groundPaintEntries(lands, { x0: 8, x1: 9, z0: 0, z1: 3 }, plan.period);
    expect(middle.every(entry => entry.offset === 0)).toBe(true);
  });

  it('gives up cleanly when the texture is larger than the GPU takes, and the cut land stays', () => {
    const { build } = fixture();
    const board = build(), { renderer } = fakeRenderer(256);
    board.applyFog(null); board.updateDetail(10);
    const warn = console.warn; console.warn = () => undefined;
    try { expect(step(board, renderer)).toBe(false); } finally { console.warn = warn; }
    expect(board.groundPaint!.failed).toBe(true);
    expect(board.groundPaint!.pending).toBe(false);
    board.updateDetail(9);
    expect(cutLand(board).every(mesh => mesh.visible)).toBe(true);
    expect(plainLand(board).every(mesh => !mesh.visible)).toBe(true);
  });

  it('bakes nothing on a disposed board, and a new board bakes again', () => {
    const { build } = fixture();
    const first = build(), { renderer } = fakeRenderer();
    bake(first, renderer);
    first.dispose();
    expect(first.groundPaint!.ready).toBe(false);
    expect(first.groundPaint!.pending).toBe(false);
    expect(step(first, renderer)).toBe(false);
    // What a lost context's rebuild does: a new board, whose texture is baked again from its own land.
    const second = build();
    expect(second.groundPaint!.pending).toBe(true);
    expect(bake(second, renderer)).toBeGreaterThan(1);
    expect(second.groundPaint!.ready).toBe(true);
  });

  it('makes a material whose shader reads the texture by the vertex\'s own position', () => {
    const { materials, plan } = fixture();
    const paint = createGroundPaint(materials.mergedLand, plan);
    owned.push(paint);
    const shader = { uniforms: {} as Record<string, unknown>, vertexShader: '', fragmentShader: 'void main() {\n#include <color_fragment>\n}' };
    (paint.material as MeshStandardMaterial).onBeforeCompile(shader as never, undefined as never);
    expect(shader.uniforms['groundPaintMap']).toBe(paint.uniforms.groundPaintMap);
    expect(shader.fragmentShader).toContain('studyPosition.x - groundPaintBox.x');
    expect(shader.fragmentShader).toContain('vColor.r > 1.5 ? groundPaint * vColor.g : vColor.rgb');
    expect(shader.fragmentShader).not.toContain('#include <color_fragment>');
  });
});

describe('the board workers', () => {
  it('carry the plan to every part, and the page puts the plain land\'s material back on its batches', async () => {
    const { map, assets, materials, plan } = fixture();
    const kit = packPaintedKit(assets, materials), remote = unpackPaintedKit(structuredClone(kit.packet));
    owned.push(...remote.bindings as { dispose(): void }[]);
    const built = buildPaintedBoard(structuredClone(map), remote.assets, remote.materials, true, null, undefined, null, null, null, structuredClone(plan));
    owned.push(built);
    const hydrated = buildPaintedBoard(map, assets, materials, true, unpackPaintedBatches(packPaintedBatches(built.exportBatches(), remote.bindings), kit.bindings),
      undefined, built.renderMap, null, null, plan);
    owned.push(hydrated);
    expect(hydrated.exportBatches().map(batch => batch.detail)).toEqual(built.exportBatches().map(batch => batch.detail));
    expect(plainLand(hydrated).length).toBeGreaterThan(0);
    for (const mesh of plainLand(hydrated)) expect((mesh.material as MeshStandardMaterial).customProgramCacheKey()).toContain(':ground-paint');
    // And the message each worker gets names the plan.
    const posted: unknown[] = [];
    const worker = { onmessage: null, onerror: null, onmessageerror: null, postMessage: (message: unknown) => { posted.push(message); }, terminate: () => undefined };
    const controller = new AbortController();
    const pending = buildPaintedBoardAsync(map, assets, materials, true, { signal: controller.signal, workerFactory: () => worker as unknown as Worker, ground: plan });
    await Promise.resolve();
    expect((posted[0] as { ground: GroundPaintPlan }).ground).toEqual(plan);
    controller.abort();
    await expect(pending).rejects.toThrow();
  });
});
