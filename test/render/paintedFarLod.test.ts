/**
 * The map-scale stand-in, and the fence around it.
 *
 * At the overview the board draws a coarser sculpt for one prop family; at play
 * zoom, under the picking ray and into the static shadow bake it draws the
 * authored one. That is the whole of the change, and every clause of that
 * sentence is a line here: the near batches must come out byte-identical to a
 * board built with no stand-in at all, the far batches must be the only ones
 * that moved, nothing standing in may cast or be picked, and the stand-in must
 * keep the sculpt's own footprint — a thinner crown reads as fewer trees, which
 * is the one change this was not allowed to make.
 */
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error Node is provided by the test runner, outside the browser TS target.
import { createHash } from 'node:crypto';
import { BoxGeometry, BufferAttribute, type BufferGeometry, IcosahedronGeometry, type InstancedMesh, type Mesh } from 'three';
import { MeshStandardMaterial } from 'three';
import { createMap } from '../../src/sim/map';
import { buildPaintedBoard, type PaintedBoard, type PaintedBoardBatch, type PaintedBoardMaterials, type PaintedVegetationAssets } from '../../src/render3d/paintedBoard.js';
import { packPaintedBatches, packPaintedKit, paintedTransferBuffers, unpackPaintedBatches, unpackPaintedKit } from '../../src/render3d/paintedBoardTransfer.js';
// @ts-expect-error The vegetation kit is JavaScript, shared with the study page.
import { VEGETATION_SPECIES, farSculpt } from '../../src/terrainStudy/vegetation.js';
import { VIEW3D } from '../../src/render3d/lookData';

const CELLS = { x: 2, y: 3, z: 2 };
const owned: { dispose(): void }[] = [];
const boards: PaintedBoard[] = [];
afterEach(() => { boards.splice(0).forEach(board => board.dispose()); owned.splice(0).forEach(item => item.dispose()); });

/** A sculpt of the kit's shape: pigment, a world UV, and the shader weights. */
function sculpt(name: string, radius = 1, detail = 2): BufferGeometry {
  const geometry = new IcosahedronGeometry(radius, detail);
  const position = geometry.getAttribute('position'), count = position.count;
  const color = new Float32Array(count * 3), uv = new Float32Array(count * 2), canopy = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    color.set([.3 + position.getY(i) * .2, .6, .35], i * 3);
    uv[i * 2] = position.getX(i) * .45; uv[i * 2 + 1] = position.getY(i) * .45;
    canopy[i] = position.getY(i) > 0 ? 1 : 0;
  }
  geometry.setAttribute('color', new BufferAttribute(color, 3));
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setAttribute('canopyWeight', new BufferAttribute(canopy, 1));
  geometry.userData['paintedAsset'] = name;
  owned.push(geometry);
  return geometry;
}
const stand = (geometry: BufferGeometry): BufferGeometry => {
  const far = farSculpt(geometry, CELLS) as BufferGeometry;
  owned.push(far);
  return far;
};
const triangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
const boxOf = (geometry: BufferGeometry): number[] => {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  return [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z].map(value => Math.round(value * 1e6) / 1e6);
};
/** Every byte a geometry would submit: attributes, their types, and the index. */
function geometryBytes(geometry: BufferGeometry, hash: { update(data: string | Uint8Array): void }): void {
  for (const [name, attribute] of [...Object.entries(geometry.attributes), ['index', geometry.index] as const]) {
    if (!attribute) continue;
    hash.update(`${name}:${attribute.itemSize}:${attribute.array.constructor.name}`);
    hash.update(new Uint8Array(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
  }
}
/** A batch list in bytes: its geometry, its transforms, and its band. */
function fingerprint(batches: PaintedBoardBatch[]): string {
  const hash = createHash('sha256');
  for (const batch of batches) {
    hash.update(JSON.stringify([batch.detail, batch.surface, batch.mountainPick, batch.castShadow, batch.count, batch.cells]));
    geometryBytes(batch.geometry, hash);
    for (const [name, attribute] of [['matrix', batch.matrix], ['color', batch.color]] as const) {
      if (!attribute) continue;
      hash.update(`${name}:${attribute.itemSize}`);
      hash.update(new Uint8Array(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
  }
  return hash.digest('hex');
}

function fixture(withStandIns: boolean) {
  const map = createMap({ width: 38, height: 4, terrain: 'grassland' });
  map.tiles.forEach((tile, i) => {
    if (i % 6 === 0) tile.terrain = 'mountain';
    else if (i % 6 === 1) tile.feature = 'forest';
    else if (i % 6 === 2) tile.hills = true;
  });
  const mat = (color = '#799741') => { const m = new MeshStandardMaterial({ color, vertexColors: true }); owned.push(m); return m; };
  const materials: PaintedBoardMaterials = {
    ground: Object.fromEntries(['grassland', 'plains', 'desert', 'tundra', 'snow', 'mountain', 'ocean', 'coast', 'lake', 'oasis', 'floodplain'].map(k => [k, mat()])),
    earth: mat(), mergedLand: mat('#ffffff'), mergedWater: mat('#ffffff'), mergedDetails: mat('#ffffff'),
    water: { river: mat(), bank: mat(), shallows: mat(), foam: mat() },
    features: { shrub: mat(), stone: mat(), fertile: mat(), bank: mat(), pool: mat(), shallow: mat(), reeds: mat() },
  };
  const leaf = sculpt('grove', .6), rock = sculpt('escarpment', .9, 1), shoulder = sculpt('escarpment-shoulder', .5, 1);
  const block = new BoxGeometry(.3, .4, .3); owned.push(block);
  const foliage = { geometry: leaf, material: mat(), ...withStandIns ? { farGeometry: stand(leaf) } : {} };
  const range = {
    geometry: rock, shoulderGeometry: shoulder, material: mat(),
    ...withStandIns ? { farGeometry: stand(rock), farShoulderGeometry: stand(shoulder) } : {},
  };
  const assets: PaintedVegetationAssets = {
    broadleaves: [foliage, foliage, foliage], cypresses: [foliage, foliage],
    escarpments: [range, range, range], limestone: { geometry: block, material: mat() },
    broadleaf: foliage, rangeMaterial: mat(),
  };
  const build = () => { const board = buildPaintedBoard(map, assets, materials); boards.push(board); return board; };
  return { map, assets, materials, build };
}
/** Which sculpts the board is actually drawing, by the name each answers to. */
function drawnFamilies(board: PaintedBoard): Set<string> {
  const names = new Set<string>();
  board.group.traverse(object => {
    const mesh = object as Mesh & { isMesh?: boolean };
    if (mesh.isMesh && mesh.visible && typeof mesh.userData['paintedFamily'] === 'string')
      names.add(mesh.userData['paintedFamily'] as string);
  });
  return names;
}

describe('the map-scale stand-in', () => {
  it('keeps the sculpt\'s box, its attributes and its facing, at a fraction of the facets', () => {
    const near = sculpt('grove', .7, 3);
    const before = Uint8Array.from(new Uint8Array((near.getAttribute('position').array as Float32Array).buffer.slice(0)));
    const far = stand(near);
    expect(triangles(far)).toBeLessThan(triangles(near) / 8);
    expect(triangles(far)).toBeGreaterThan(4);
    // The footprint and the height are the reading; the facets are not.
    expect(boxOf(far)).toEqual(boxOf(near));
    expect(Object.keys(far.attributes).sort()).toEqual(['canopyWeight', 'color', 'normal', 'position', 'uv']);
    expect(far.userData['paintedAsset']).toBe('grove far');
    // The sculpt itself is an input, never an output.
    expect(new Uint8Array((near.getAttribute('position').array as Float32Array).buffer.slice(0))).toEqual(before);
    const normals = far.getAttribute('normal'), position = far.getAttribute('position');
    for (let i = 0; i < normals.count; i++)
      expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 5);
    // A closed sculpt's stand-in faces outward: every face agrees with the
    // direction of its own centre, or the crown has holes punched in it.
    let outward = 0, faces = 0;
    for (let i = 0; i < position.count; i += 3) {
      const cx = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
      const cy = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3;
      const cz = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
      faces++;
      if (cx * normals.getX(i) + cy * normals.getY(i) + cz * normals.getZ(i) > 0) outward++;
    }
    expect(outward).toBe(faces);
  });

  it('is a pure function of the sculpt, so the bundle and the GLB fallback agree', () => {
    const near = sculpt('grove', .8, 2);
    const hash = (geometry: BufferGeometry) => {
      const digest = createHash('sha256'); geometryBytes(geometry, digest); return digest.digest('hex');
    };
    expect(hash(stand(near))).toBe(hash(stand(near)));
  });

  it('collapses to nothing on a grid of one cell, which is how a family opts out', () => {
    expect(farSculpt(sculpt('grove', .5, 1), { x: 1, y: 1, z: 1 })).toBe(null);
  });
});

describe('the board at the far band', () => {
  it('swaps the stand-in into the far batches and leaves every near batch byte-identical', () => {
    const plain = fixture(false).build().exportBatches();
    const standIn = fixture(true).build().exportBatches();
    const near = (batches: PaintedBoardBatch[]) => batches.filter(batch => batch.detail !== 'far');
    expect(fingerprint(near(standIn))).toBe(fingerprint(near(plain)));
    expect(fingerprint(standIn)).not.toBe(fingerprint(plain));
    // Same batches, same instances, same transforms — fewer facets each.
    const far = (batches: PaintedBoardBatch[]) => batches.filter(batch => batch.detail === 'far' && batch.matrix);
    expect(far(standIn)).toHaveLength(far(plain).length);
    expect(far(standIn).map(batch => batch.count)).toEqual(far(plain).map(batch => batch.count));
    const facets = (batches: PaintedBoardBatch[]) => batches.reduce((sum, batch) => sum + triangles(batch.geometry) * (batch.count ?? 1), 0);
    expect(facets(far(standIn))).toBeLessThan(facets(far(plain)) / 4);
  });

  it('never casts, never picks, and moves no instance', () => {
    const board = fixture(true).build(), plain = fixture(false).build();
    for (const batch of board.exportBatches().filter(batch => batch.detail === 'far')) {
      expect(batch.castShadow).toBe(false);
      expect(batch.mountainPick).toBe(false);
    }
    expect(board.pickMeshes.length).toBe(plain.pickMeshes.length);
    expect(board.instanceCount).toBe(plain.instanceCount);
  });

  it('shows the sculpt at play zoom and under the bake, and the stand-in only far out', () => {
    const board = fixture(true).build();
    board.applyFog(null);
    board.updateDetail(60);
    const play = drawnFamilies(board);
    board.updateDetail(8);
    const overview = drawnFamilies(board);
    expect([...play].some(name => name.endsWith(' far'))).toBe(false);
    expect([...play]).toContain('grove');
    expect([...overview].some(name => name.endsWith(' far'))).toBe(true);
    expect([...overview]).not.toContain('grove');
    // A bake is near geometry whatever the zoom: the static sun casts the sculpt.
    board.updateDetail(8, true);
    expect([...drawnFamilies(board)].some(name => name.endsWith(' far'))).toBe(false);
  });

  it('travels to the worker and back as a binding, not as a second copy of the vertices', () => {
    const { map, assets, materials } = fixture(true);
    const { packet, bindings } = packPaintedKit(assets, materials);
    const remote = unpackPaintedKit(structuredClone(packet));
    owned.push(...remote.bindings as { dispose(): void }[]);
    const built = buildPaintedBoard(structuredClone(map), remote.assets, remote.materials);
    boards.push(built);
    const packed = packPaintedBatches(built.exportBatches(), remote.bindings);
    // The stand-in is one of the kit's own resources, so what crosses back is a
    // batch's instances and nothing else: no far batch ships a second copy of
    // the vertices it stands on.
    const shipped = new Set(paintedTransferBuffers(packed));
    for (const asset of [remote.assets.broadleaf, remote.assets.escarpments[0]!])
      for (const geometry of [asset.geometry, asset.shoulderGeometry, asset.farGeometry, asset.farShoulderGeometry])
        if (geometry) expect(shipped.has((geometry.getAttribute('position').array as Float32Array).buffer as ArrayBuffer)).toBe(false);
    const hydrated = buildPaintedBoard(map, assets, materials, true, unpackPaintedBatches(packed, bindings));
    boards.push(hydrated);
    // And the band survives the crossing: the far batches stand on this side's
    // own stand-in, not on a sculpt the worker sent home.
    const far = hydrated.exportBatches().filter(batch => batch.detail === 'far' && batch.matrix);
    expect(far.length).toBeGreaterThan(0);
    expect(far.some(batch => batch.base === assets.broadleaf.farGeometry)).toBe(true);
    expect(far.some(batch => batch.base === assets.broadleaf.geometry)).toBe(false);
    expect(fingerprint(hydrated.exportBatches())).toBe(fingerprint(built.exportBatches()));
  });

  it('shares one stand-in across every far block on the map', () => {
    const board = fixture(true).build();
    const geometries: BufferGeometry[] = [];
    board.group.traverse(object => {
      const mesh = object as InstancedMesh & { isInstancedMesh?: boolean };
      if (mesh.isInstancedMesh && (mesh.userData['paintedFamily'] as string | undefined)?.endsWith(' far'))
        geometries.push(mesh.geometry);
    });
    expect(geometries.length).toBeGreaterThan(3);
    expect(new Set(geometries.map(geometry => geometry.getAttribute('position'))).size).toBeLessThan(geometries.length);
  });
});

describe('the distance sheet', () => {
  it('names one family, the kit knows it, and its grid is real cells', () => {
    const families = new Set((VEGETATION_SPECIES as { family: string }[]).map(row => row.family));
    const sheet = VIEW3D.painted.lod.distantCells;
    expect(Object.keys(sheet)).toHaveLength(1);
    for (const [named, cells] of Object.entries(sheet)) {
      expect([...families]).toContain(named);
      for (const axis of [cells!.x, cells!.y, cells!.z]) expect(axis).toBeGreaterThanOrEqual(1);
    }
  });
});
