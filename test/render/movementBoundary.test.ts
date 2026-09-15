import { describe, expect, it } from 'vitest';
import { createMap, offsetToAxial, axialToOffset } from '../../src/sim/map';
import { HEX_DIRECTIONS } from '../../src/sim/hex';
import { movementEdges, movementFrontier, frontierRibbon, movementBoundaryGeometry } from '../../src/render3d/movementBoundary';
import { VIEW3D } from '../../src/render3d/lookData';

const map = createMap({ width: 12, height: 10, terrain: 'grassland' });
const radius = VIEW3D.board.hexRadius;
const frontier = (cells: { col: number; row: number }[], origin?: { col: number; row: number }) =>
  movementFrontier(map, movementEdges(map, cells, origin));

describe('movement frontier', () => {
  it('omits shared edges, including across the map seam', () => {
    expect(movementEdges(map, [{ col: 2, row: 2 }])).toHaveLength(6);
    expect(movementEdges(map, [{ col: 2, row: 2 }, { col: 3, row: 2 }])).toHaveLength(10);
    expect(movementEdges(map, [{ col: 0, row: 2 }, { col: 11, row: 2 }])).toHaveLength(10);
    expect(movementEdges(map, [{ col: 0, row: 2 }, { col: 12, row: 2 }])).toHaveLength(6);
  });
  it('includes the selected origin without filling unreachable holes', () => {
    const origin = { col: 5, row: 4 }, hex = offsetToAxial(origin.col, origin.row);
    const ring = HEX_DIRECTIONS.map(d => axialToOffset({ q: hex.q + d.q, r: hex.r + d.r }));
    expect(movementEdges(map, ring)).toHaveLength(24);
    expect(movementEdges(map, ring, origin)).toHaveLength(18);
    expect(movementEdges(map, [], origin)).toHaveLength(0);
  });
  it('retains isolated islands and edges at the north boundary', () => {
    expect(movementEdges(map, [{ col: 2, row: 0 }, { col: 8, row: 5 }])).toHaveLength(12);
  });
});

describe('the frontier walks into closed rings', () => {
  /** Every ring closes on itself, and each corner of it appears exactly once. */
  const closes = (loops: ReturnType<typeof movementFrontier>): void => {
    expect(loops.length).toBeGreaterThan(0);
    for (const { stations } of loops) {
      expect(stations.length).toBeGreaterThanOrEqual(3);
      const seen = new Set<string>();
      for (const s of stations) {
        const key = `${s.x.toFixed(6)},${s.z.toFixed(6)}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
      // Consecutive stations are a fraction of an edge apart — including the
      // closing step from the last back to the first.
      for (let i = 0; i < stations.length; i++) {
        const a = stations[i]!, b = stations[(i + 1) % stations.length]!;
        const step = Math.hypot(a.x - b.x, a.z - b.z);
        expect(step).toBeGreaterThan(1e-9);
        expect(step).toBeLessThan(radius * 0.6);
      }
    }
  };

  it('a single hex is one ring of one hexagon', () => {
    const loops = frontier([{ col: 4, row: 4 }]);
    expect(loops).toHaveLength(1);
    closes(loops);
    // Six edges, four stations each, and every station on the hexagon's own circle.
    expect(loops[0]!.stations).toHaveLength(24);
    const c = { x: 0, z: 0 };
    for (const s of loops[0]!.stations) { c.x += s.x / 24; c.z += s.z / 24; }
    for (const s of loops[0]!.stations) {
      expect(Math.hypot(s.x - c.x, s.z - c.z)).toBeLessThanOrEqual(radius + 1e-9);
      expect(Math.hypot(s.x - c.x, s.z - c.z)).toBeGreaterThan(radius * 0.8);
    }
  });

  it('every corner is shared by exactly the edges that meet there', () => {
    const origin = { col: 5, row: 4 }, hex = offsetToAxial(origin.col, origin.row);
    const ring = HEX_DIRECTIONS.map(d => axialToOffset({ q: hex.q + d.q, r: hex.r + d.r }));
    for (const cells of [
      [{ col: 4, row: 4 }, { col: 5, row: 4 }],
      [{ col: 3, row: 3 }, { col: 4, row: 3 }, { col: 4, row: 4 }, { col: 3, row: 5 }],
      ring,
    ]) {
      const loops = frontier(cells);
      closes(loops);
      // The corner a step arrives at and the corner the next step leaves from are
      // the same station object's point — coincidence is exact, not within a
      // tolerance — so count the distinct corner positions against the edges.
      const corners = new Set<string>();
      for (const { stations } of loops) {
        for (let i = 0; i < stations.length; i += 4) corners.add(`${stations[i]!.x},${stations[i]!.z}`);
      }
      expect(corners.size).toBe(movementEdges(map, cells).length);
    }
  });

  it('a set straddling the wrap seam is one unbroken ring', () => {
    const loops = frontier([{ col: 0, row: 4 }, { col: 11, row: 4 }]);
    expect(loops).toHaveLength(1);
    closes(loops);
    // The ring stays inside one copy of the board rather than leaping its width.
    const xs = loops[0]!.stations.map(s => s.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(radius * 4);
  });

  it('holes and islands each keep their own ring', () => {
    const origin = { col: 5, row: 4 }, hex = offsetToAxial(origin.col, origin.row);
    const ring = HEX_DIRECTIONS.map(d => axialToOffset({ q: hex.q + d.q, r: hex.r + d.r }));
    const donut = frontier(ring);
    expect(donut).toHaveLength(2);
    closes(donut);
    const islands = frontier([{ col: 2, row: 0 }, { col: 8, row: 5 }]);
    expect(islands).toHaveLength(2);
    closes(islands);
  });

  it('is the same ring whatever order the edges arrive in', () => {
    const cells = [{ col: 3, row: 3 }, { col: 4, row: 3 }, { col: 4, row: 4 }];
    const edges = movementEdges(map, cells);
    const forward = movementFrontier(map, edges);
    const backward = movementFrontier(map, [...edges].reverse());
    expect(JSON.stringify(backward)).toBe(JSON.stringify(forward));
  });
});

describe('the ribbon over the rings', () => {
  const cells = [{ col: 3, row: 3 }, { col: 4, row: 3 }, { col: 4, row: 4 }];
  const loops = frontier(cells);

  it('gives both rails of a cross-section the station\'s own height', () => {
    const geometry = frontierRibbon(loops, 0.045);
    const position = geometry.getAttribute('position');
    const stations = loops.flatMap(l => l.stations);
    // The buffer is float32, so the station's own height is the rounded one.
    const heights = new Set(stations.map(s => Math.fround(s.y)));
    for (let i = 0; i < position.count; i++) {
      expect(Number.isFinite(position.getY(i))).toBe(true);
      expect(heights.has(position.getY(i))).toBe(true);
    }
    geometry.dispose();
  });

  it('samples the ground once, so two widths agree everywhere but the width', () => {
    const thin = frontierRibbon(loops, 0.045), thick = frontierRibbon(loops, 0.08);
    const a = thin.getAttribute('position'), b = thick.getAttribute('position');
    expect(a.count).toBe(b.count);
    for (let i = 0; i < a.count; i++) expect(b.getY(i)).toBe(a.getY(i));
    thin.dispose(); thick.dispose();
  });

  it('carries the rails round a corner without a cap or a gap', () => {
    expect(loops).toHaveLength(1);
    const geometry = frontierRibbon(loops, 0.045);
    const position = geometry.getAttribute('position');
    // Two triangles a station, and nothing else: no fan, no cap.
    const stations = loops.reduce((n, l) => n + l.stations.length, 0);
    expect(position.count).toBe(stations * 6);
    // The quad leaving a station starts on the vertices the quad arriving at it
    // ended on — the seam between two segments is a shared pair, not a butt joint.
    for (let i = 0; i < stations - 1; i++) {
      for (const [from, to] of [[6 * i + 2, 6 * i + 6], [6 * i + 4, 6 * i + 9]]) {
        expect([position.getX(to), position.getY(to), position.getZ(to)])
          .toEqual([position.getX(from), position.getY(from), position.getZ(from)]);
      }
    }
    geometry.dispose();
  });

  it('produces finite terrain ribbons with no triangles filling tile centers', () => {
    const geometry = movementBoundaryGeometry(map, movementEdges(map, [{ col: 0, row: 0 }]), .045);
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      expect(Number.isFinite(positions.getY(i))).toBe(true);
      expect(Math.hypot(positions.getX(i), positions.getZ(i))).toBeGreaterThan(.8);
    }
    geometry.dispose();
  });

  it('draws nothing at all for an empty frontier', () => {
    const geometry = movementBoundaryGeometry(map, movementEdges(map, [], { col: 3, row: 3 }), .045);
    expect(geometry.getAttribute('position').count).toBe(0);
    geometry.dispose();
  });
});
