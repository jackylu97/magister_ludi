import { describe, expect, it } from 'vitest';
import { createMap, type GameMap } from '../../src/sim/map';
// @ts-expect-error The reusable study art modules remain JavaScript.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';
// @ts-expect-error The reusable study art modules remain JavaScript.
import { createTerrainPainter } from '../../src/terrainStudy/terrainPigment.js';
// @ts-expect-error The reusable study art modules remain JavaScript.
import { createWaterPainter } from '../../src/terrainStudy/waterPigment.js';
// @ts-expect-error The reusable study art modules remain JavaScript.
import { coastPaths, riverPaths } from '../../src/terrainStudy/waterContours.js';

type Path = { points: [number, number][]; closed: boolean };
function maxSegment(path: Path) {
  return Math.max(...path.points.slice(1).map((p, i) => Math.hypot(p[0] - path.points[i]![0], p[1] - path.points[i]![1])));
}

describe('painted cylinder seams', () => {
  it('uses identical ordered terrain pigments on both sides of the joined edge', () => {
    const map = prepareTerrainMap(createMap({ width: 12, height: 6, terrain: 'grassland' }), { wrap: true }) as GameMap;
    const painter = createTerrainPainter(map), period = Math.sqrt(3) * map.width;
    for (let row = 0; row < map.height; row++) for (let i = 0; i < 60; i++) {
      const x = row % 2 ? 0 : -Math.sqrt(3) / 2, z = row * 1.5 - .47 + i * .94 / 60;
      const first = map.tiles[row * map.width]!, last = map.tiles[row * map.width + map.width - 1]!;
      expect(painter.sample(first, x, z).getHex()).toBe(painter.sample(last, x + period, z).getHex());
    }
  });

  it('closes a seam-straddling island with local contour segments while finite studies retain their open border', () => {
    const raw = createMap({ width: 8, height: 5, terrain: 'coast' });
    raw.tiles[16]!.terrain = raw.tiles[23]!.terrain = 'grassland';
    const wrapped = prepareTerrainMap(raw, { wrap: true }) as GameMap;
    const finite = coastPaths(prepareTerrainMap(raw)) as Path[], paths = coastPaths(wrapped) as Path[];
    expect(finite).toHaveLength(2);
    expect(paths).toHaveLength(1); expect(paths[0]!.closed).toBe(true);
    expect(maxSegment(paths[0]!)).toBeLessThan(1.1);
    const painter = createWaterPainter(wrapped), period = Math.sqrt(3) * raw.width;
    for (let i = 0; i < 200; i++) {
      const x = -1 + i / 100, z = 1.5 + (i % 25) * .12;
      expect(painter.sample(x, z).getHex()).toBe(painter.sample(x + period, z).getHex());
    }
  });

  it('deduplicates the river shared by the last and first columns without a map-spanning ribbon', () => {
    const raw = createMap({ width: 8, height: 5, terrain: 'grassland' });
    raw.tiles[16]!.riverEdges = 1 << 3; raw.tiles[23]!.riverEdges = 1;
    expect(riverPaths(prepareTerrainMap(raw)).paths).toHaveLength(2);
    const network = riverPaths(prepareTerrainMap(raw, { wrap: true })) as { paths: Path[]; nodes: unknown[] };
    expect(network.paths).toHaveLength(1); expect(network.nodes).toHaveLength(2);
    expect(maxSegment(network.paths[0]!)).toBeCloseTo(1);
  });

  it('keeps a coast circling the cylinder locally connected across its planar cut', () => {
    const raw = createMap({ width: 8, height: 5, terrain: 'coast' });
    raw.tiles.filter(tile => tile.row >= 2).forEach(tile => { tile.terrain = 'grassland'; });
    const paths = coastPaths(prepareTerrainMap(raw, { wrap: true })) as Path[];
    expect(paths).toHaveLength(1);
    expect(maxSegment(paths[0]!)).toBeLessThan(1.1);
    expect(paths[0]!.points.length).toBeGreaterThan(raw.width * 2);
  });
});
