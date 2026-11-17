import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { createMap } from '../../src/sim/map';
import { indexGeometry } from '../../src/terrainStudy/indexGeometry.js';
// @ts-expect-error Approved terrain JavaScript.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';
// @ts-expect-error Approved terrain JavaScript.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';

/**
 * The weld as it was before the third render speed pass, kept as the
 * reference. The pass hashed the normal with the position, which changes only
 * where a vertex lands in the hash table, so the index and every attribute must
 * come out the same.
 */
function referenceIndex(geometry: T.BufferGeometry): T.BufferGeometry {
  const attrs = Object.entries(geometry.attributes) as [string, T.BufferAttribute][], count = geometry.attributes.position!.count;
  const streams = attrs.map(([, a]) => ({ size: a.itemSize, bits: a.array instanceof Float32Array ? new Uint32Array(a.array.buffer, a.array.byteOffset, a.array.length) : a.array }));
  const position = streams[attrs.findIndex(([name]) => name === 'position')]!;
  let capacity = 1; while (capacity < count * 1.5) capacity *= 2;
  const table = new Uint32Array(capacity), canonical = new Uint32Array(count), unique = new Uint32Array(count), indices = new Uint32Array(count), mask = capacity - 1;
  let total = 0;
  const equal = (a: number, b: number): boolean => {
    for (const { bits, size } of streams) for (let j = 0; j < size; j++) if (bits[a * size + j] !== bits[b * size + j]) return false;
    return true;
  };
  for (let i = 0; i < count; i++) {
    let hash = 2166136261;
    for (let j = 0; j < position.size; j++) hash = Math.imul(hash ^ (position.bits[i * position.size + j] as number), 16777619);
    hash ^= hash >>> 16; let slot = hash & mask;
    while (table[slot] && !equal(i, table[slot]! - 1)) slot = (slot + 1) & mask;
    if (!table[slot]) { table[slot] = i + 1; canonical[i] = total; unique[total++] = i; }
    indices[i] = canonical[table[slot]! - 1]!;
  }
  const stride = attrs.reduce((sum, [, a]) => sum + a.itemSize * (a.array as Float32Array).BYTES_PER_ELEMENT, 0), indexBytes = count * (total <= 65535 ? 2 : 4);
  if ((count - total) * stride <= indexBytes) return geometry;
  for (const [name, attr] of attrs) {
    const Kind = attr.array.constructor as Float32ArrayConstructor, array = new Kind(total * attr.itemSize);
    for (let i = 0; i < total; i++) for (let j = 0; j < attr.itemSize; j++) array[i * attr.itemSize + j] = attr.array[unique[i]! * attr.itemSize + j]!;
    geometry.setAttribute(name, new T.BufferAttribute(array, attr.itemSize, attr.normalized));
  }
  geometry.setIndex(new T.BufferAttribute(total <= 65535 ? new Uint16Array(indices) : indices, 1));
  return geometry;
}

function flatGround(): T.BufferGeometry {
  const map = createMap({ width: 8, height: 6, terrain: 'grassland' });
  for (const cell of [9, 10, 17, 26, 27]) map.tiles[cell]!.hills = true;
  const prepared = prepareTerrainMap(map, { wrap: true });
  const tops = prepared.tiles.slice(0, 24).map((tile: unknown) => (terrainMesh(tile) as T.BufferGeometry[])[0]!);
  const parts: T.BufferGeometry[] = tops.map((top: T.BufferGeometry, i: number) => {
    const g = top.index ? top.toNonIndexed() : top;
    g.setAttribute('paintedCell', new T.BufferAttribute(new Uint16Array(g.getAttribute('position').count).fill(i), 1));
    return g;
  });
  // Merged by hand, as `mergeGeometries` would: one non-indexed stream for each attribute.
  const merged = new T.BufferGeometry();
  for (const name of ['position', 'color', 'normal', 'paintedCell']) {
    const arrays = parts.map((part: T.BufferGeometry) => part.getAttribute(name).array as Float32Array | Uint16Array);
    const Kind = arrays[0]!.constructor as Float32ArrayConstructor, out = new Kind(arrays.reduce((n: number, a: Float32Array | Uint16Array) => n + a.length, 0));
    let at = 0; for (const a of arrays) { out.set(a as Float32Array, at); at += a.length; }
    merged.setAttribute(name, new T.BufferAttribute(out, parts[0]!.getAttribute(name).itemSize));
  }
  return merged;
}

const dump = (g: T.BufferGeometry) => ({
  index: g.index ? Array.from(g.index.array) : null, indexKind: g.index?.array.constructor.name ?? null,
  attributes: Object.fromEntries(Object.entries(g.attributes).map(([name, a]) => [name, [a.array.constructor.name, a.itemSize, Array.from(a.array)]])),
});

describe('welding a geometry into an indexed one', () => {
  it('gives the same index and attributes as the reference weld on flat-shaded ground', () => {
    const a = flatGround(), b = a.clone();
    expect(dump(indexGeometry(a))).toEqual(dump(referenceIndex(b)));
    // A flat field: every corner shared by faces with the same normal, so the weld does index it.
    const field = new T.PlaneGeometry(4, 3, 24, 18).toNonIndexed();
    field.deleteAttribute('uv');
    const welded = indexGeometry(field.clone());
    expect(welded.index).not.toBeNull();
    expect(dump(welded)).toEqual(dump(referenceIndex(field.clone())));
  });

  it('gives the same answer with no normal, and with corners that differ only in their normal', () => {
    const plain = flatGround(); plain.deleteAttribute('normal');
    const welded = indexGeometry(plain.clone());
    expect(welded.index).not.toBeNull();
    expect(dump(welded)).toEqual(dump(referenceIndex(plain.clone())));
    // Two faces on the same corners with opposite normals: welded apart, as before.
    const twin = new T.BufferGeometry();
    const corners = [0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1];
    const positions = [...corners.slice(0, 9), ...corners.slice(0, 9), ...corners.slice(3, 12), ...corners.slice(3, 12)];
    twin.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    twin.setAttribute('normal', new T.Float32BufferAttribute(positions.map((_, i) => (i % 3 === 1 ? (Math.floor(i / 9) % 2 ? -1 : 1) : 0)), 3));
    expect(dump(indexGeometry(twin.clone()))).toEqual(dump(referenceIndex(twin.clone())));
  });
});
