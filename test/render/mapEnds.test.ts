import { describe, expect, it } from 'vitest';
import type { Mesh } from 'three';

import viewJson from '../../data/view3d.json';
import type { GameMap } from '../../src/sim/map';
import { type MapEndsStyle, buildMapEnds } from '../../src/render3d/mapEnds';

const RENDERER = import.meta.glob('../../src/render3d/renderer3d.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const ROOT3 = Math.sqrt(3);
const SHEET = viewJson.visualTest.mapEnds as MapEndsStyle;
/** The rail reads only the map's size. Odd and even heights put the south row on a different half-column shift. */
const mapOf = (width: number, height: number): GameMap => ({ width, height, tiles: [] } as unknown as GameMap);

/** How far a point lies outside the hexes of the last row at its end. Negative means it is over a hex. */
function clearOfLastRow(x: number, z: number, map: GameMap): number {
  const north = z < (map.height - 1) * .75, row = north ? 0 : map.height - 1, end = north ? -1 : 1;
  // Distance outward from the line through the points of the row.
  const d = end * (z - row * 1.5) - 1;
  // The cut: 0 under a hex's point, -0.5 at the notch between two hexes.
  const along = (x / ROOT3 - (row % 2) * .5 + map.width * 8) % 1, fromCentre = Math.min(along, 1 - along);
  return d + fromCentre;
}

function measure(map: GameMap, style: MapEndsStyle): { draws: number; triangles: number; worst: number; minZ: number; maxZ: number; dispose(): void } {
  const built = buildMapEnds(map, style);
  let triangles = 0, worst = Infinity, minZ = Infinity, maxZ = -Infinity;
  const meshes = built.group.children as Mesh[];
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position');
    triangles += position.count / 3;
    for (let i = 0; i < position.count; i++) {
      const z = position.getZ(i);
      worst = Math.min(worst, clearOfLastRow(position.getX(i), z, map));
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
  }
  return { draws: meshes.length, triangles, worst, minZ, maxZ, dispose: built.dispose };
}

describe('the rails at the north and south ends of the map', () => {
  const styles: [string, MapEndsStyle][] = [['plain', { ...SHEET, style: 'plain' }], ['moulded', { ...SHEET, style: 'moulded' }]];

  it('the sheet names a style the builder knows, and carries the moulded rail\'s settings', () => {
    expect(['plain', 'moulded']).toContain(SHEET.style);
    expect(SHEET.moulded).toBeDefined();
  });

  for (const [name, style] of styles) for (const [width, height] of [[24, 18], [40, 25], [7, 3]] as const) {
    it(`${name}, ${width} by ${height}: it builds, sits outside the last row at both ends, and no part is over a hex`, () => {
      const map = mapOf(width, height), rail = measure(map, style);
      expect(rail.triangles).toBeGreaterThan(0);
      // No vertex is over a hex of the last row; the gap is the smallest distance allowed.
      expect(rail.worst).toBeGreaterThanOrEqual(style.gap - 1e-4);
      // There is a rail at each end: one north of the first row's points, one south of the last row's.
      expect(rail.minZ).toBeLessThan(-1);
      expect(rail.maxZ).toBeGreaterThan((height - 1) * 1.5 + 1);
      rail.dispose();
    });
  }

  it('on: false is the caller\'s switch, and the plain rail is what an unknown style builds', () => {
    // `on: false` builds nothing: the renderer does not call the builder. Read from its source, since the gate is there.
    const source = Object.values(RENDERER)[0]!;
    expect(source).toMatch(/if \(VIEW3D\.visualTest\.mapEnds\?\.on\) \{\s*this\.mapEnds = buildMapEnds\(/);
    const plain = measure(mapOf(24, 18), { ...SHEET, style: 'plain' });
    const unknown = measure(mapOf(24, 18), { ...SHEET, style: 'no such style' });
    expect(unknown.triangles).toBe(plain.triangles);
  });

  it('the moulded rail is a few draw calls and a modest number of triangles', () => {
    const map = mapOf(80, 50);
    const moulded = measure(map, { ...SHEET, style: 'moulded' }), plain = measure(map, { ...SHEET, style: 'plain' });
    // One rail mesh and one shade mesh for each of the three wrap copies.
    expect(moulded.draws).toBe(6);
    expect(plain.draws).toBe(12);
    // Per wrap copy, on the largest map: under 100 triangles a column for both ends together.
    expect(moulded.triangles / 3 / map.width).toBeLessThan(100);
  });

  it('the moulded rail carries the grain attribute, and normals for the paint shader', () => {
    const built = buildMapEnds(mapOf(24, 18), { ...SHEET, style: 'moulded' });
    const rail = (built.group.children as Mesh[]).find(mesh => mesh.name === 'map-ends-rail')!;
    expect(rail.castShadow && rail.receiveShadow).toBe(true);
    expect(rail.geometry.getAttribute('rail').count).toBe(rail.geometry.getAttribute('position').count);
    expect(rail.geometry.getAttribute('normal').count).toBe(rail.geometry.getAttribute('position').count);
    // Every top face looks up: no face of the rail is wound the wrong way and so drawn from below only.
    const normal = rail.geometry.getAttribute('normal'), position = rail.geometry.getAttribute('position');
    let down = 0;
    for (let i = 0; i < normal.count; i++) if (normal.getY(i) < -1e-6 && position.getY(i) > 0) down++;
    expect(down).toBe(0);
    built.dispose();
  });
});
