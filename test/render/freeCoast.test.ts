/**
 * A free coastline (`src/render3d/freeCoast.js`; `docs/flags.md`, "A free
 * coastline"): the shore is one smooth line, the ground slopes under the water
 * along it, and two hexes that share a shore edge agree on the ground there.
 */
import { describe, expect, it } from 'vitest';
import { DataUtils, type BufferGeometry } from 'three';

import type { GameMap } from '../../src/sim/map';
import { createMap } from '../../src/sim/map';
import { VIEW3D } from '../../src/render3d/lookData';
import { RIVER, createSeaField } from '../../src/render3d/seaField';
// @ts-expect-error The coast module is JavaScript, like the terrain modules it feeds.
import { createFreeCoast } from '../../src/render3d/freeCoast.js';
// @ts-expect-error The sea's distance bake is JavaScript, like the coast module it reads.
import { bakeSeaDistances } from '../../src/render3d/seaDistances.js';
// @ts-expect-error Approved terrain modules remain JavaScript.
import { prepareTerrainMap, baseSurfaceHeight, coastApronHeight, coastAt, isWater, neighbour, onTileTop, WATER_LEVEL, LAND_LEVEL } from '../../src/terrainStudy/surface.js';
// @ts-expect-error Approved terrain modules remain JavaScript.
import { terrainMesh, coastApron } from '../../src/terrainStudy/terrainMesh.js';
// @ts-expect-error Approved terrain modules remain JavaScript.
import { flatWater } from '../../src/terrainStudy/water.js';

const WIDTH = 8, HEIGHT = 7, KNOBS = VIEW3D.visualTest.coast;
type Tile = GameMap['tiles'][number] & { coast?: { segments: Float32Array; under: number } };

/** Land in the west, sea in the east, a lake of one hex in the land and an island of one hex in the sea. */
function board(): { map: GameMap; coast: ReturnType<typeof createFreeCoast>; tile: (col: number, row: number) => Tile } {
  const map = createMap({ width: WIDTH, height: HEIGHT, terrain: 'grassland' });
  for (const t of map.tiles) if (t.col >= 4) t.terrain = 'coast';
  map.tiles[3 * WIDTH + 1]!.terrain = 'lake';
  map.tiles[3 * WIDTH + 6]!.terrain = 'grassland';
  const prepared = prepareTerrainMap(map, { wrap: true }) as GameMap;
  const coast = createFreeCoast(prepared, KNOBS);
  for (const t of prepared.tiles as Tile[]) { const carve = coast.carve(t); if (carve) t.coast = carve; }
  return { map: prepared, coast, tile: (col, row) => prepared.tiles[row * WIDTH + col]! as Tile };
}
const centreOf = (t: { col: number; row: number }): [number, number] => [Math.sqrt(3) * (t.col + (t.row % 2) * 0.5), t.row * 1.5];
const beside = (map: GameMap, t: Tile): boolean =>
  [0, 1, 2, 3, 4, 5].some(d => { const other = neighbour(t, map, d) as Tile | null; return !!other && isWater(other) !== isWater(t); });

describe('a free coastline', () => {
  const { map, coast, tile } = board();

  it('gives the waterline to every hex beside a shore, and to no other', () => {
    for (const t of map.tiles as Tile[]) expect(!!t.coast, `${t.col},${t.row}`).toBe(beside(map, t));
    // The mainland's two shores (the map wraps), the lake and the island.
    expect(coast.lineCount).toBe(4);
  });

  it('keeps the waterline near the hex shore, and every hex\'s centre on its own side of it', () => {
    // Every piece of the line, as each hex beside it holds it: the distance from its start to the nearest shore edge.
    let worst = 0;
    for (const t of map.tiles as Tile[]) {
      if (!t.coast || isWater(t)) continue;
      const s = t.coast.segments;
      for (let i = 0; i < s.length; i += coast.stride) {
        let best = Infinity;
        for (const land of map.tiles as Tile[]) {
          if (isWater(land)) continue;
          const [cx, cz] = centreOf(land), [tx, tz] = centreOf(t);
          for (let d = 0; d < 6; d++) {
            const other = neighbour(land, map, d) as Tile | null;
            if (!other || !isWater(other)) continue;
            for (const shift of [-Math.sqrt(3) * WIDTH, 0, Math.sqrt(3) * WIDTH]) {
              const a = (d - .5) * Math.PI / 3, b = (d + .5) * Math.PI / 3;
              const ax = cx + shift + Math.cos(a) - tx, az = cz + Math.sin(a) - tz, ex = Math.cos(b) - Math.cos(a), ez = Math.sin(b) - Math.sin(a);
              const u = Math.max(0, Math.min(1, ((s[i]! - ax) * ex + (s[i + 1]! - az) * ez) / (ex * ex + ez * ez)));
              best = Math.min(best, Math.hypot(s[i]! - ax - ex * u, s[i + 1]! - az - ez * u));
            }
          }
        }
        worst = Math.max(worst, best);
      }
    }
    // A shore that runs north to south steps half a hex left and right from row to row; the line runs down the middle of the steps.
    expect(worst).toBeLessThan(.6);
    expect(worst).toBeGreaterThan(.05);
    for (const t of map.tiles as Tile[]) {
      if (!t.coast) continue;
      const at = coastAt(t, 0, 0) as { edge: number; beach: number };
      if (isWater(t)) expect(at.edge, `${t.col},${t.row}`).toBeLessThan(-.1);
      else expect(at.edge, `${t.col},${t.row}`).toBeGreaterThan(at.beach);
    }
  });

  it('leaves the middle of a land hex dry and of a water hex wet, and slopes down between them', () => {
    const land = tile(3, 2), sea = tile(4, 2);
    expect(baseSurfaceHeight(land, 0, 0)).toBeGreaterThan(LAND_LEVEL - .02);
    expect(baseSurfaceHeight(sea, 0, 0)).toBe(WATER_LEVEL);
    expect(coastApronHeight(sea, 0, 0)).toBeLessThan(WATER_LEVEL);
    // From the land hex's centre to the shared edge, the ground never rises by more than its small relief.
    let last = Infinity;
    for (let k = 0; k <= 20; k++) {
      const y = baseSurfaceHeight(land, .866 * k / 20, 0);
      expect(y).toBeLessThan(last + .01);
      last = y;
    }
    expect(onTileTop(land, 0, 0)).toBe(true);
  });

  it('puts the ground at the water\'s level on the line, above it on the land side and below it on the sea side', () => {
    const land = tile(3, 2), s = land.coast!.segments;
    for (let i = 0; i < s.length; i += coast.stride * 5) {
      const [x, z, nx, nz] = [s[i]!, s[i + 1]!, s[i + 2]!, s[i + 3]!];
      expect(Math.abs(coastAt(land, x, z).edge)).toBeLessThan(1e-4);
      expect(coastApronHeight(land, x + nx * .03, z + nz * .03)).toBeGreaterThan(WATER_LEVEL);
      expect(coastApronHeight(land, x - nx * .03, z - nz * .03)).toBeLessThan(WATER_LEVEL);
      expect(Math.hypot(nx, nz)).toBeCloseTo(1, 4);
    }
  });

  it('gives a land hex and the water hex beside it the same ground along their shared edge', () => {
    for (const [col, row] of [[3, 2], [3, 3], [3, 4], [6, 3]] as const) {
      const land = tile(col, row), [lx, lz] = centreOf(land);
      for (let d = 0; d < 6; d++) {
        const sea = neighbour(land, map, d) as Tile | null;
        if (!sea || !isWater(sea)) continue;
        const nx = Math.cos(d * Math.PI / 3), nz = Math.sin(d * Math.PI / 3);
        // The water hex's own centre, on the same side of the seam as the land hex.
        const sx = lx + nx * Math.sqrt(3), sz = lz + nz * Math.sqrt(3);
        for (const along of [-.45, -.2, 0, .2, .45]) {
          const x = lx + nx * .866 - nz * along, z = lz + nz * .866 + nx * along;
          const onLand = baseSurfaceHeight(land, x - lx, z - lz), onSea = coastApronHeight(sea, x - sx, z - sz);
          expect(Math.abs(onLand - onSea), `${col},${row} d${d} at ${along}`).toBeLessThan(2e-3);
        }
      }
    }
  });

  it('meshes the two sides of a shore edge with the same vertices', () => {
    const land = tile(3, 2), sea = tile(4, 2), [lx, lz] = centreOf(land);
    const [top] = terrainMesh(land) as [BufferGeometry], apron = coastApron(sea) as BufferGeometry;
    expect(apron.getAttribute('position').count).toBeGreaterThan(0);
    const onEdge = (geometry: BufferGeometry): string[] => {
      const p = geometry.getAttribute('position'), keys = new Set<string>();
      for (let i = 0; i < p.count; i++) {
        // The shared edge faces +x from the land hex: the line x = centre + apothem.
        if (Math.abs(p.getX(i) - lx - Math.sqrt(3) / 2) > 1e-4 || Math.abs(p.getZ(i) - lz) > .5) continue;
        keys.add(`${Math.round(p.getZ(i) * 500)}:${Math.round(p.getY(i) * 500)}`);
      }
      return [...keys].sort();
    };
    // Every vertex the water hex's ground has on the edge, the land hex has too, at the same height.
    const landKeys = new Set(onEdge(top));
    const apronKeys = onEdge(apron);
    expect(apronKeys.length).toBeGreaterThan(0);
    for (const key of apronKeys) expect(landKeys.has(key), key).toBe(true);
  });

  it('measures the sea from the waterline: positive on the water, on a land hex as on a water hex', () => {
    const field = createSeaField(map as never, { shoreReach: 1.2, edgeReach: 1.5, wraps: true, coast, cutRivers: false });
    const land = tile(3, 2), sea = tile(4, 2), far = tile(5, 5);
    const [sx, sz] = centreOf(sea), [lx, lz] = centreOf(land), [fx, fz] = centreOf(far);
    expect(field.sample(sea as never, sx, sz)[0]).toBeGreaterThan(.3);
    expect(field.sample(land as never, lx, lz)[0]).toBeLessThan(-.3);
    expect(field.sample(far as never, fx, fz)[0]).toBeGreaterThan(.3);
    // The same point on the shared edge reads the same from both hexes.
    const x = lx + .866, z = lz + .1;
    expect(field.sample(land as never, x, z)[0]).toBeCloseTo(field.sample(sea as never, x, z)[0], 3);
    // The land hex's own sheet takes the sea's numbers; any other water on it is a river's.
    // (An odd row stands half a hex out to sea here, so the waterline crosses it.)
    const sheet = flatWater(tile(3, 3)) as BufferGeometry;
    sheet.userData.seaSheet = true;
    field.attribute(sheet, tile(3, 3) as never);
    const painted = sheet.getAttribute('paintedWater');
    let sea0 = 0;
    for (let i = 0; i < painted.count; i++) if (painted.getX(i) > 0) sea0++;
    expect(sea0).toBeGreaterThan(0);
    const [ribbon] = terrainMesh(tile(2, 5)) as [BufferGeometry];
    field.attribute(ribbon, tile(2, 5) as never);
    expect(ribbon.getAttribute('paintedWater').getX(0)).toBe(RIVER);
  });

  it('lays sand on the slope of a land hex and of the water hex beside it', () => {
    // An odd row stands half a hex out to sea here, so the waterline crosses the land hex.
    const land = tile(3, 3), sea = tile(4, 2);
    const [top] = terrainMesh(land) as [BufferGeometry];
    const sand = coast.sand(land, top) as BufferGeometry | null;
    expect(sand?.getAttribute('position').count ?? 0).toBeGreaterThan(0);
    // Sand lies on the slope: none of it higher than the land, and some of it under the water.
    const y = sand!.getAttribute('position');
    let low = Infinity, high = -Infinity;
    for (let i = 0; i < y.count; i++) { low = Math.min(low, y.getY(i)); high = Math.max(high, y.getY(i)); }
    expect(high).toBeLessThan(LAND_LEVEL + KNOBS.sandLift + .012);
    expect(low).toBeLessThan(WATER_LEVEL);
    expect(coast.sand(tile(1, 1), terrainMesh(tile(1, 1))[0])).toBeNull();
    expect(coast.sand(sea, coastApron(sea))).not.toBeNull();
  });
});

describe('the sea\'s distances as a picture of the map', () => {
  // Land in the west, two columns of coast, then ocean.
  const map = createMap({ width: 10, height: 7, terrain: 'grassland' });
  for (const t of map.tiles) if (t.col >= 4) t.terrain = t.col >= 6 && t.col <= 8 ? 'ocean' : 'coast';
  const prepared = prepareTerrainMap(map, { wrap: true }) as GameMap;
  const baked = bakeSeaDistances(prepared, KNOBS, null) as { texture: { image: { data: Uint16Array } }; width: number; height: number; originX: number; originZ: number; period: number; spanZ: number };
  /** The three distances at the grid point nearest a hex's centre. */
  const at = (col: number, row: number): [number, number, number] => {
    const [x, z] = centreOf({ col, row });
    const i = Math.min(baked.width - 1, Math.floor((x - baked.originX) / baked.period * baked.width)), j = Math.floor((z - baked.originZ) / baked.spanZ * baked.height);
    const k = (j * baked.width + i) * 4, data = baked.texture.image.data;
    return [DataUtils.fromHalfFloat(data[k]!), DataUtils.fromHalfFloat(data[k + 1]!), DataUtils.fromHalfFloat(data[k + 2]!)];
  };

  it('is positive on the water and negative on the land', () => {
    expect(at(2, 3)[0]).toBeLessThan(-.5);
    expect(at(5, 3)[0]).toBeGreaterThan(.5);
    expect(at(7, 3)[0]).toBeCloseTo(KNOBS.field.shoreReach, 2);
  });

  it('is positive on the ocean and negative on the coast and the land, by the second line', () => {
    expect(at(7, 3)[1]).toBeGreaterThan(.3);
    expect(at(4, 3)[1]).toBeLessThan(-.3);
    expect(at(1, 3)[1]).toBeLessThan(-.3);
  });

  it('changes by less than a grid step from one grid point to the next, so a band\'s edge is smooth', () => {
    const data = baked.texture.image.data, step = baked.period / baked.width;
    let worst = 0;
    for (let j = 0; j < baked.height; j++) for (let i = 0; i < baked.width - 1; i++) for (const channel of [0, 1]) {
      // Only over the board: past its top and bottom rows the lines end, and there is no water to paint.
      const z = baked.originZ + (j + .5) / baked.height * baked.spanZ;
      if (z < -.9 || z > 6 * 1.5 + .9) continue;
      const a = DataUtils.fromHalfFloat(data[(j * baked.width + i) * 4 + channel]!), b = DataUtils.fromHalfFloat(data[(j * baked.width + i + 1) * 4 + channel]!);
      worst = Math.max(worst, Math.abs(a - b));
    }
    expect(worst).toBeLessThan(step * 1.6);
  });

  it('reads far from any river where the map has none', () => {
    expect(at(5, 3)[2]).toBeCloseTo(KNOBS.field.mouthReach, 2);
  });
});
