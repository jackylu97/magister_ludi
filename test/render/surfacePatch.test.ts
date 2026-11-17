import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { createMap } from '../../src/sim/map';
// @ts-expect-error Approved terrain JavaScript.
import { surfacePatch } from '../../src/terrainStudy/surfacePatch.js';
// @ts-expect-error Approved terrain JavaScript.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';
// @ts-expect-error Approved terrain JavaScript.
import { prepareTerrainMap, centre } from '../../src/terrainStudy/surface.js';

type Point = [number, number];

/**
 * The clip as it was before the third render speed pass, kept here as the
 * reference: the pass changed only how a triangle outside the mark's bounds is
 * rejected (no corner lists built first), so every patch must be the same
 * numbers in the same order.
 */
function referencePatch(top: T.BufferGeometry, polygon: Point[], color: T.Color, lift = .007): T.BufferGeometry {
  const p = top.attributes.position!, out: number[] = [], ink: number[] = [];
  const area = polygon.reduce((s, a, i) => { const b = polygon[(i + 1) % polygon.length]!; return s + a[0] * b[1] - b[0] * a[1]; }, 0);
  const sign = area < 0 ? -1 : 1;
  const minX = Math.min(...polygon.map(q => q[0])), maxX = Math.max(...polygon.map(q => q[0]));
  const minZ = Math.min(...polygon.map(q => q[1])), maxZ = Math.max(...polygon.map(q => q[1]));
  for (let i = 0; i < p.count; i += 3) {
    let face = [0, 1, 2].map(j => [p.getX(i + j), p.getY(i + j), p.getZ(i + j)]);
    if (Math.max(...face.map(v => v[0]!)) < minX || Math.min(...face.map(v => v[0]!)) > maxX || Math.max(...face.map(v => v[2]!)) < minZ || Math.min(...face.map(v => v[2]!)) > maxZ) continue;
    for (let e = 0; e < polygon.length && face.length; e++) {
      const a = polygon[e]!, b = polygon[(e + 1) % polygon.length]!, next: number[][] = [];
      const side = (v: number[]): number => sign * ((b[0] - a[0]) * (v[2]! - a[1]) - (b[1] - a[1]) * (v[0]! - a[0]));
      for (let j = 0; j < face.length; j++) {
        const v = face[j]!, w = face[(j + 1) % face.length]!, sv = side(v), sw = side(w);
        if (sv >= -1e-9) next.push(v);
        if ((sv >= 0) !== (sw >= 0)) { const t = sv / (sv - sw); next.push(v.map((n, k) => n + (w[k]! - n) * t)); }
      }
      face = next;
    }
    for (let j = 1; j < face.length - 1; j++) for (const v of [face[0]!, face[j]!, face[j + 1]!]) { out.push(v[0]!, v[1]! + lift, v[2]!); ink.push(color.r, color.g, color.b); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(out, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(ink, 3)); g.computeVertexNormals(); return g;
}

describe('a mark clipped to the ground', () => {
  it('is the same patch as the reference clip, for marks inside, across and outside a hill hex', () => {
    const map = createMap({ width: 6, height: 5, terrain: 'grassland' });
    map.tiles[14]!.hills = true;
    const prepared = prepareTerrainMap(map, { wrap: true });
    const tile = prepared.tiles[14], c = centre(tile) as { x: number; z: number };
    const [top] = terrainMesh(tile) as T.BufferGeometry[];
    let seed = 11;
    const random = (): number => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
    let drawn = 0;
    for (let n = 0; n < 60; n++) {
      // A band, a wedge or a small polygon, anywhere from the hex's middle to a hex and a half away.
      const sides = 3 + Math.floor(random() * 4), x = c.x + (random() - .5) * 3, z = c.z + (random() - .5) * 3, size = .1 + random() * .9;
      const polygon: Point[] = [...Array(sides).keys()].map(k => {
        const angle = k / sides * Math.PI * 2 + random() * .4;
        return [x + Math.cos(angle) * size * (.5 + random()), z + Math.sin(angle) * size * (.5 + random())];
      });
      if (n % 2) polygon.reverse();
      const color = new T.Color(random(), random(), random());
      const expected = referencePatch(top!, polygon, color), actual = surfacePatch(top, polygon, color) as T.BufferGeometry;
      expect(Array.from(actual.getAttribute('position').array)).toEqual(Array.from(expected.getAttribute('position').array));
      expect(Array.from(actual.getAttribute('color').array)).toEqual(Array.from(expected.getAttribute('color').array));
      expect(Array.from(actual.getAttribute('normal').array)).toEqual(Array.from(expected.getAttribute('normal').array));
      if (expected.getAttribute('position').count) drawn++;
    }
    expect(drawn).toBeGreaterThan(15);
  });
});
