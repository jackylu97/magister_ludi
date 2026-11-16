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

function measure(map: GameMap, style: MapEndsStyle): { draws: number; triangles: number; worst: number; shadeWorst: number; minZ: number; maxZ: number; dispose(): void } {
  const built = buildMapEnds(map, style);
  let triangles = 0, worst = Infinity, shadeWorst = Infinity, minZ = Infinity, maxZ = -Infinity;
  const meshes = built.group.children as Mesh[];
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position');
    triangles += position.count / 3;
    for (let i = 0; i < position.count; i++) {
      const z = position.getZ(i);
      // The shade strips are flat and transparent, and the north one lies on the last row on purpose. They are measured apart.
      const clear = clearOfLastRow(position.getX(i), z, map);
      if (mesh.name === 'map-ends-shade') shadeWorst = Math.min(shadeWorst, clear); else worst = Math.min(worst, clear);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
  }
  return { draws: meshes.length, triangles, worst, shadeWorst, minZ, maxZ, dispose: built.dispose };
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
      // The wall's shade reaches onto the last row by its own length and no more.
      if (name === 'moulded') expect(rail.shadeWorst).toBeGreaterThanOrEqual(style.gap - (style.moulded!.raised?.shadeReach ?? 0) - 1e-4);
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
    // Per wrap copy: under 125 triangles a column for both ends together.
    expect(moulded.triangles / 3 / map.width).toBeLessThan(125);
  });

  /** The wood of one end, as points measured from that end's own line: along the rail from its west end, outward from the hex points, and up. */
  function woodOfEnd(map: GameMap, style: MapEndsStyle, end: 'north' | 'south'): string[] {
    const built = buildMapEnds(map, style);
    const rail = (built.group.children as Mesh[]).find(mesh => mesh.name === 'map-ends-rail')!;
    const position = rail.geometry.getAttribute('position'), grain = rail.geometry.getAttribute('rail');
    const row = end === 'north' ? 0 : map.height - 1, sign = end === 'north' ? -1 : 1, west = ROOT3 * ((row % 2) * .5 - .5);
    const points: string[] = [];
    for (let i = 0; i < position.count; i++) {
      // Wood only. The brass figures are left out on purpose: they read from the south at both ends, so they are not mirrored.
      if (grain.getX(i) === 0) continue;
      const z = position.getZ(i);
      if ((z < (map.height - 1) * .75) !== (end === 'north')) continue;
      const along = position.getX(i) - west, outward = sign * (z - row * 1.5) - 1;
      points.push(`${along.toFixed(3)} ${outward.toFixed(3)} ${position.getY(i).toFixed(3)}`);
    }
    built.dispose();
    return points.sort();
  }

  for (const height of [18, 25]) {
    it(`the two ends are mirror images of each other (a map ${height} rows high)`, () => {
      // An even height puts the south's last row half a column to the east of the north's; the points are measured from each end's own west end.
      const map = mapOf(24, height), style = { ...SHEET, style: 'moulded' };
      const north = woodOfEnd(map, style, 'north'), south = woodOfEnd(map, style, 'south');
      expect(north.length).toBeGreaterThan(1000);
      expect(south).toEqual(north);
    });
  }

  it('both ends are raised by the one shared block: a wall at the cut and a taller lip', () => {
    const map = mapOf(24, 18), raised = SHEET.moulded!.raised!;
    const heights = (style: MapEndsStyle): { top: Record<string, number>; cut: Record<string, number> } => {
      const built = buildMapEnds(map, style);
      const position = (built.group.children as Mesh[]).find(mesh => mesh.name === 'map-ends-rail')!.geometry.getAttribute('position');
      // The highest point of each end, and the highest point on each end's cut (within a little of the hex points' line).
      const top = { north: -Infinity, south: -Infinity }, cut = { north: -Infinity, south: -Infinity };
      for (let i = 0; i < position.count; i++) {
        const z = position.getZ(i), y = position.getY(i), end = z < (map.height - 1) * .75 ? 'north' : 'south';
        top[end] = Math.max(top[end], y);
        if (clearOfLastRow(position.getX(i), z, map) < SHEET.gap + 1e-3) cut[end] = Math.max(cut[end], y);
      }
      built.dispose();
      return { top, cut };
    };
    const { raised: _dropped, ...flat } = SHEET.moulded!;
    const high = heights({ ...SHEET, style: 'moulded' }), low = heights({ ...SHEET, style: 'moulded', moulded: flat });
    for (const end of ['north', 'south']) {
      expect(high.top[end]! - low.top[end]!).toBeCloseTo(raised.raise + raised.lip, 4);
      expect(high.cut[end]! - low.cut[end]!).toBeCloseTo(raised.wall === 'behind' ? 0 : raised.raise, 4);
      // The wall shows well above the ground.
      expect(high.cut[end]! - raised.ground).toBeGreaterThan(.15);
    }
    expect(high.top.north).toBeCloseTo(high.top.south!, 5);
    expect(high.cut.north).toBeCloseTo(high.cut.south!, 5);
  });

  it('the board\'s side goes down and outward from the rail\'s foot, and a depth of 0 leaves it out', () => {
    const map = mapOf(24, 18), moulded = SHEET.moulded!, side = moulded.side!;
    const lowest = (style: MapEndsStyle): { y: number; outward: number; triangles: number } => {
      const built = buildMapEnds(map, style);
      const position = (built.group.children as Mesh[]).find(mesh => mesh.name === 'map-ends-rail')!.geometry.getAttribute('position');
      let y = Infinity, outward = Infinity;
      for (let i = 0; i < position.count; i++) {
        y = Math.min(y, position.getY(i));
        // Below the rail's foot, the least distance of the wood from the hex points' line.
        if (position.getY(i) < -moulded.foot - 1e-3) outward = Math.min(outward, Math.abs(position.getZ(i) - (position.getZ(i) < 12 ? 0 : (map.height - 1) * 1.5)) - 1);
      }
      built.dispose();
      return { y, outward, triangles: position.count / 3 };
    };
    const withSide = lowest({ ...SHEET, style: 'moulded' });
    const without = lowest({ ...SHEET, style: 'moulded', moulded: { ...moulded, side: { ...side, depth: 0 } } });
    expect(side.depth).toBeGreaterThan(0);
    expect(withSide.y).toBeCloseTo(-moulded.foot - side.depth, 4);
    expect(without.y).toBeCloseTo(-moulded.foot, 4);
    // Everything below the foot is at least the rail's own width out (less the gap): nothing of the side is nearer the hexes.
    expect(withSide.outward).toBeGreaterThanOrEqual(moulded.width - 1e-3);
    expect(without.triangles).toBeLessThan(withSide.triangles);
  });

  it('the moulded rail carries the grain attribute, and normals for the paint shader', () => {
    const built = buildMapEnds(mapOf(24, 18), { ...SHEET, style: 'moulded' });
    const rail = (built.group.children as Mesh[]).find(mesh => mesh.name === 'map-ends-rail')!;
    expect(rail.castShadow && rail.receiveShadow).toBe(true);
    expect(rail.geometry.getAttribute('rail').count).toBe(rail.geometry.getAttribute('position').count);
    expect(rail.geometry.getAttribute('normal').count).toBe(rail.geometry.getAttribute('position').count);
    // Every flat top looks up: none is wound the wrong way and so drawn from below only. (The underside of the belt on the outer side slopes down by design, so the check is for faces that look straight down.)
    const normal = rail.geometry.getAttribute('normal'), position = rail.geometry.getAttribute('position');
    let down = 0;
    for (let i = 0; i < normal.count; i++) if (normal.getY(i) < -.99 && position.getY(i) > 0) down++;
    expect(down).toBe(0);
    built.dispose();
  });
});
