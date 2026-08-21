import { describe, expect, it } from 'vitest';

import { HEX_DIRECTIONS } from '../src/sim/hex';
import {
  type GameMap,
  type Tile,
  createMap,
  getTileAt,
  tileIndex,
  tileNeighbors,
} from '../src/sim/map';
import { MAPGEN_CONFIG, generateMap, generateMapDetail } from '../src/sim/mapgen';
import { makeRng } from '../src/sim/rng';
import { isFreshwaterTerrain, isWaterTerrain } from '../src/sim/terrainData';
import {
  type RiverVertex,
  DIRECTION_COUNT,
  classifyLakes,
  computeFreshwater,
  cornerSteps,
  hasFreshWater,
  hasRiverEdge,
  neighborInDirection,
  oppositeDirection,
  riverCountFor,
  riverEdgeCount,
  setRiverEdge,
  traceRiver,
  traceRivers,
  vertexAltitude,
  vertexKey,
  vertexTiles,
  waterBodies,
} from '../src/sim/water';

/** A land map with nothing on it, for hand-built geography. */
function land(width: number, height: number): GameMap {
  return createMap({ width, height, terrain: 'grassland' });
}

function at(map: GameMap, col: number, row: number): Tile {
  return getTileAt(map, col, row)!;
}

/** Sets a rectangle of tiles to one terrain, by (col, row) pairs. */
function put(map: GameMap, terrain: Tile['terrain'], cells: [number, number][]): void {
  for (const [col, row] of cells) at(map, col, row).terrain = terrain;
}

// --- edge storage -----------------------------------------------------------

describe('river edge storage', () => {
  it('pairs every direction with its opposite', () => {
    for (let d = 0; d < DIRECTION_COUNT; d++) {
      const back = oppositeDirection(d);
      expect(back).not.toBe(d);
      expect(oppositeDirection(back)).toBe(d);
      // The reason the mirror can be a plain `+ 3`: the two direction vectors
      // are exact negations of each other.
      // `+ 0` normalises -0, which deep equality distinguishes and hexes do not.
      expect(HEX_DIRECTIONS[back]).toEqual({
        q: -HEX_DIRECTIONS[d]!.q + 0,
        r: -HEX_DIRECTIONS[d]!.r + 0,
      });
    }
  });

  it('flags an edge on both of the tiles that share it', () => {
    const map = land(6, 5);
    const tile = at(map, 2, 2);
    setRiverEdge(map, tile, 1);
    const neighbor = neighborInDirection(map, tile, 1)!;
    expect(hasRiverEdge(tile, 1)).toBe(true);
    expect(hasRiverEdge(neighbor, oppositeDirection(1))).toBe(true);
    expect(riverEdgeCount(tile)).toBe(1);
    expect(riverEdgeCount(neighbor)).toBe(1);
  });

  it('mirrors across the east-west seam', () => {
    const map = land(6, 5);
    const west = at(map, 0, 2);
    setRiverEdge(map, west, 3); // west, i.e. across the seam
    expect(hasRiverEdge(west, 3)).toBe(true);
    expect(hasRiverEdge(at(map, 5, 2), 0)).toBe(true);
  });

  it('refuses to flag half an edge past a pole', () => {
    const map = land(6, 5);
    const top = at(map, 2, 0);
    setRiverEdge(map, top, 4); // north-west, off the map
    expect(top.riverEdges).toBe(0);
  });
});

// --- lakes ------------------------------------------------------------------

describe('lake classification', () => {
  it('turns a small enclosed water body into a lake', () => {
    const map = land(8, 6);
    put(map, 'ocean', [
      [3, 2],
      [4, 2],
    ]);
    expect(classifyLakes(map, 8)).toBe(1);
    expect(at(map, 3, 2).terrain).toBe('lake');
    expect(at(map, 4, 2).terrain).toBe('lake');
  });

  it('leaves a water body larger than maxSize alone', () => {
    const map = land(8, 6);
    put(map, 'ocean', [
      [3, 2],
      [4, 2],
      [3, 3],
    ]);
    expect(classifyLakes(map, 2)).toBe(0);
    expect(at(map, 3, 2).terrain).toBe('ocean');
  });

  it('treats a body straddling the seam as one body, not two', () => {
    const map = land(6, 5);
    // (0, 2) and (5, 2) are east-west neighbours across the wrap.
    put(map, 'ocean', [
      [0, 2],
      [5, 2],
    ]);
    const bodies = waterBodies(map);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.tiles).toEqual([tileIndex(map, 0, 2), tileIndex(map, 5, 2)].sort((a, b) => a - b));
    // With room for only one tile the pair is too big — which is only true if
    // the wrap was seen. Two separate one-tile bodies would both become lakes.
    expect(classifyLakes(map, 1)).toBe(0);
    expect(at(map, 0, 2).terrain).toBe('ocean');
  });

  it('never makes a lake out of water on a polar row', () => {
    const map = land(8, 6);
    put(map, 'ocean', [[3, 0]]);
    put(map, 'ocean', [[4, 5]]);
    expect(classifyLakes(map, 8)).toBe(0);
    expect(at(map, 3, 0).terrain).toBe('ocean');
    expect(at(map, 4, 5).terrain).toBe('ocean');
  });

  it('reports bodies and their members in index order', () => {
    const map = land(8, 6);
    put(map, 'ocean', [
      [5, 4],
      [1, 1],
      [2, 1],
    ]);
    const bodies = waterBodies(map);
    expect(bodies).toHaveLength(2);
    expect(bodies[0]!.tiles).toEqual([tileIndex(map, 1, 1), tileIndex(map, 2, 1)]);
    expect(bodies[1]!.tiles).toEqual([tileIndex(map, 5, 4)]);
  });

  it('is only ocean, never lake, that becomes coast on a generated map', () => {
    for (const seed of [1, 7, 31337, 2024]) {
      const map = generateMap(seed, 'standard');
      for (const tile of map.tiles) {
        if (tile.terrain !== 'coast') continue;
        // A coast tile must touch land *and* be reachable from the open sea; a
        // lake tile next to it would mean the lake minted a shelf.
        expect(tileNeighbors(map, tile).some((n) => !isWaterTerrain(n.terrain))).toBe(true);
        expect(tileNeighbors(map, tile).every((n) => n.terrain !== 'lake')).toBe(true);
      }
    }
  });

  it('keeps every lake within the configured size on a generated map', () => {
    const map = generateMap(31337, 'standard');
    for (const body of waterBodies(map)) {
      const lakes = body.tiles.filter((i) => map.tiles[i]!.terrain === 'lake');
      if (lakes.length === 0) continue;
      // A body is entirely lake or entirely not; a mixed one would mean the
      // classification ran per tile instead of per body.
      expect(lakes).toHaveLength(body.tiles.length);
      expect(body.tiles.length).toBeLessThanOrEqual(MAPGEN_CONFIG.lakes.maxSize);
      expect(body.touchesPole).toBe(false);
    }
  });
});

// --- corners ----------------------------------------------------------------

describe('the corner graph', () => {
  const map = land(9, 7);

  it('gives every interior corner three hexes and three ways out', () => {
    for (const north of [true, false]) {
      const v: RiverVertex = { col: 4, row: 3, north };
      expect(vertexTiles(map, v)).toHaveLength(3);
      expect(cornerSteps(map, v)).toHaveLength(3);
    }
  });

  it('is bipartite: every step flips north and south', () => {
    for (const north of [true, false]) {
      for (const step of cornerSteps(map, { col: 4, row: 3, north })) {
        expect(step.to.north).toBe(!north);
      }
    }
  });

  it('is symmetric: every step can be walked back over the same edge', () => {
    for (const north of [true, false]) {
      const from: RiverVertex = { col: 4, row: 3, north };
      for (const step of cornerSteps(map, from)) {
        const back = cornerSteps(map, step.to).find(
          (s) => vertexKey(map, s.to) === vertexKey(map, from),
        );
        expect(back).toBeDefined();
        // The same physical edge, named from whichever side you stand on.
        const forward = step.edge;
        const reverse = back!.edge;
        const sameSide =
          forward.tile === reverse.tile && forward.direction === reverse.direction;
        const mirrored =
          neighborInDirection(map, forward.tile, forward.direction) === reverse.tile &&
          oppositeDirection(forward.direction) === reverse.direction;
        expect(sameSide || mirrored).toBe(true);
      }
    }
  });

  it('has no corner at the poles, where only two hexes meet', () => {
    expect(vertexTiles(map, { col: 4, row: 0, north: true })).toBeNull();
    expect(vertexTiles(map, { col: 4, row: 6, north: false })).toBeNull();
    expect(vertexAltitude(map, { col: 4, row: 0, north: true })).toBeNull();
  });

  it('gives every corner on the map a distinct key', () => {
    const keys = new Set<number>();
    for (const tile of map.tiles) {
      for (const north of [true, false]) {
        keys.add(vertexKey(map, { col: tile.col, row: tile.row, north }));
      }
    }
    expect(keys.size).toBe(map.tiles.length * 2);
  });

  it('averages the elevation of a corner’s three hexes', () => {
    const local = land(9, 7);
    const v: RiverVertex = { col: 4, row: 3, north: true };
    const tiles = vertexTiles(local, v)!;
    tiles[0]!.elevation = 0.3;
    tiles[1]!.elevation = 0.6;
    tiles[2]!.elevation = 0.9;
    expect(vertexAltitude(local, v)).toBeCloseTo(0.6, 12);
  });
});

// --- tracing ----------------------------------------------------------------

/** A land map sloping steadily downhill to the south, with sea on the last rows. */
function slope(width: number, height: number): GameMap {
  const map = land(width, height);
  for (const tile of map.tiles) {
    tile.elevation = 1 - tile.row / (height - 1);
    if (tile.row >= height - 2) tile.terrain = 'ocean';
  }
  return map;
}

describe('river tracing', () => {
  it('walks a slope down to the sea', () => {
    const map = slope(9, 9);
    const trace = traceRiver(map, { col: 4, row: 1, north: false }, 40)!;
    expect(trace).not.toBeNull();
    expect(trace.ending).toBe('water');
    expect(trace.vertices).toHaveLength(trace.edges.length + 1);
    expect(trace.edges.length).toBeGreaterThan(2);
  });

  it('never runs uphill, and reports its altitudes non-increasing', () => {
    for (const size of ['duel', 'standard']) {
      for (const seed of [1, 7, 1234]) {
        const { map, rivers } = generateMapDetail(seed, size);
        for (const river of rivers) {
          let previous = Infinity;
          for (const vertex of river.vertices) {
            const altitude = vertexAltitude(map, vertex)!;
            expect(altitude).not.toBeNull();
            expect(altitude).toBeLessThanOrEqual(previous);
            previous = altitude;
          }
        }
      }
    }
  });

  it('breaks altitude ties by corner key, so a plateau is not a coin flip', () => {
    // Every corner has the same altitude, so every step is a tie and the walk
    // is decided entirely by the tie-break. It must still terminate, and twice
    // in a row it must do exactly the same thing.
    const flat = land(11, 9);
    for (const tile of flat.tiles) tile.elevation = 0.5;
    const first = traceRiver(flat, { col: 5, row: 4, north: true }, 200);
    const second = traceRiver(flat, { col: 5, row: 4, north: true }, 200);
    expect(second).toEqual(first);

    // And the first step really is the lowest-keyed of the three options.
    const start: RiverVertex = { col: 5, row: 4, north: true };
    const keys = cornerSteps(flat, start).map((s) => vertexKey(flat, s.to));
    if (first) {
      expect(vertexKey(flat, first.vertices[1]!)).toBe(Math.min(...keys));
    }
  });

  it('terminates rather than looping on a plateau', () => {
    const flat = land(9, 7);
    for (const tile of flat.tiles) tile.elevation = 0.5;
    const trace = traceRiver(flat, { col: 4, row: 3, north: true }, 500);
    // Either it dead-ends (null) or it stops somewhere, but it never revisits.
    if (trace) {
      const keys = trace.vertices.map((v) => vertexKey(flat, v));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('gives up rather than drawing a river that goes nowhere', () => {
    // A single peak with nowhere to drain: every neighbour of the spring is
    // higher, so the very first step fails.
    const bowl = land(9, 7);
    for (const tile of bowl.tiles) tile.elevation = 0.9;
    for (const t of vertexTiles(bowl, { col: 4, row: 3, north: true })!) t.elevation = 0.1;
    expect(traceRiver(bowl, { col: 4, row: 3, north: true }, 40)).toBeNull();
  });

  it('merges into a river it runs into instead of crossing it', () => {
    const map = slope(11, 11);
    const rng = makeRng(4242);
    const config = {
      ...MAPGEN_CONFIG.rivers,
      minSpringElevation: 0.5,
      minSpringSpacing: 1,
      minLength: 1,
      countPer1000Tiles: 1000,
      minCount: 30,
    };
    const rivers = traceRivers(map, rng, config);
    expect(rivers.length).toBeGreaterThan(1);
    expect(rivers.some((r) => r.ending === 'river')).toBe(true);
  });

  it('scales the river count with the map size', () => {
    const config = MAPGEN_CONFIG.rivers;
    expect(riverCountFor(config, 40, 25)).toBe(
      Math.max(config.minCount, Math.round(config.countPer1000Tiles)),
    );
    expect(riverCountFor(config, 80, 52)).toBeGreaterThan(riverCountFor(config, 40, 25));
    expect(riverCountFor(config, 4, 4)).toBe(config.minCount);
  });
});

describe('rivers on generated maps', () => {
  const sizes = ['duel', 'standard'] as const;
  const seeds = [1, 7, 1234, 31337];

  it('keeps every edge flag mirrored on both tiles', () => {
    for (const size of sizes) {
      for (const seed of seeds) {
        const map = generateMap(seed, size);
        for (const tile of map.tiles) {
          for (let d = 0; d < DIRECTION_COUNT; d++) {
            if (!hasRiverEdge(tile, d)) continue;
            const neighbor = neighborInDirection(map, tile, d);
            expect(neighbor).toBeDefined();
            expect(hasRiverEdge(neighbor!, oppositeDirection(d))).toBe(true);
          }
        }
      }
    }
  });

  it('runs every river edge between two land tiles', () => {
    for (const seed of seeds) {
      const map = generateMap(seed, 'standard');
      for (const tile of map.tiles) {
        if (tile.riverEdges === 0) continue;
        expect(isWaterTerrain(tile.terrain)).toBe(false);
        for (let d = 0; d < DIRECTION_COUNT; d++) {
          if (!hasRiverEdge(tile, d)) continue;
          expect(isWaterTerrain(neighborInDirection(map, tile, d)!.terrain)).toBe(false);
        }
      }
    }
  });

  it('ends every river at water or at another river, and keeps none too short', () => {
    for (const size of sizes) {
      for (const seed of seeds) {
        const { rivers } = generateMapDetail(seed, size);
        expect(rivers.length).toBeGreaterThan(0);
        for (const river of rivers) {
          expect(['water', 'river']).toContain(river.ending);
          expect(river.edges.length).toBeGreaterThanOrEqual(MAPGEN_CONFIG.rivers.minLength);
          expect(river.edges.length).toBeLessThanOrEqual(MAPGEN_CONFIG.rivers.maxLength);
        }
      }
    }
  });

  it('meets its river quota on every size and seed', () => {
    for (const size of ['duel', 'standard', 'large'] as const) {
      for (const seed of seeds) {
        const { map, rivers } = generateMapDetail(seed, size);
        expect(rivers).toHaveLength(riverCountFor(MAPGEN_CONFIG.rivers, map.width, map.height));
      }
    }
  });

  it('spaces springs apart', () => {
    const { rivers } = generateMapDetail(31337, 'standard');
    const springs = rivers.map((r) => r.vertices[0]!);
    const keys = springs.map((v) => `${v.col},${v.row},${v.north}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('is deterministic in the seed, and different seeds differ', () => {
    const masks = (seed: number, size: string): number[] =>
      generateMap(seed, size).tiles.map((t) => t.riverEdges);
    expect(masks(4242, 'duel')).toEqual(masks(4242, 'duel'));
    expect(masks(4242, 'standard')).toEqual(masks(4242, 'standard'));
    expect(masks(1, 'duel')).not.toEqual(masks(2, 'duel'));
  });

  it('does not let river generation disturb the terrain it runs over', () => {
    // Rivers are the last thing rolled, after both noise fields; a map with the
    // rivers stripped out must be the map without them.
    const a = generateMap(2024, 'duel');
    const b = generateMap(2024, 'duel');
    for (let i = 0; i < a.tiles.length; i++) {
      expect(b.tiles[i]!.terrain).toBe(a.tiles[i]!.terrain);
      expect(b.tiles[i]!.elevation).toBe(a.tiles[i]!.elevation);
    }
  });
});

// --- fresh water ------------------------------------------------------------

describe('fresh water', () => {
  it('has exactly the adjacency semantics it claims', () => {
    const map = land(9, 7);
    // A lake, an ocean, and a river far from either.
    at(map, 2, 2).terrain = 'lake';
    at(map, 6, 2).terrain = 'ocean';
    const riverTile = at(map, 4, 5);
    setRiverEdge(map, riverTile, 0);
    const acrossTheRiver = neighborInDirection(map, riverTile, 0)!;

    computeFreshwater(map);

    // A tile with a river on one of its own edges: yes, both sides.
    expect(hasFreshWater(riverTile)).toBe(true);
    expect(hasFreshWater(acrossTheRiver)).toBe(true);
    // A tile next to the lake: yes.
    for (const neighbor of tileNeighbors(map, at(map, 2, 2))) {
      expect(hasFreshWater(neighbor)).toBe(true);
    }
    // A tile next to the ocean: no. Salt.
    for (const neighbor of tileNeighbors(map, at(map, 6, 2))) {
      expect(hasFreshWater(neighbor)).toBe(false);
    }
    // The water itself never drinks — not even the lake.
    expect(hasFreshWater(at(map, 2, 2))).toBe(false);
    expect(hasFreshWater(at(map, 6, 2))).toBe(false);
    // Land two tiles from the lake, with no river: no.
    expect(hasFreshWater(at(map, 0, 0))).toBe(false);
    // A river one tile away is somebody else's water.
    const nextDoor = neighborInDirection(map, riverTile, 3)!;
    expect(riverEdgeCount(nextDoor)).toBe(0);
    expect(hasFreshWater(nextDoor)).toBe(false);
  });

  it('is idempotent', () => {
    const map = land(9, 7);
    at(map, 2, 2).terrain = 'lake';
    computeFreshwater(map);
    const first = map.tiles.map((t) => t.freshwater);
    computeFreshwater(map);
    expect(map.tiles.map((t) => t.freshwater)).toEqual(first);
  });

  it('matches its definition exactly on generated maps', () => {
    for (const size of ['duel', 'standard'] as const) {
      for (const seed of [1, 7, 1234, 31337]) {
        const map = generateMap(seed, size);
        let fresh = 0;
        for (const tile of map.tiles) {
          const expected =
            !isWaterTerrain(tile.terrain) &&
            (tile.riverEdges !== 0 ||
              tileNeighbors(map, tile).some((n) => isFreshwaterTerrain(n.terrain)));
          expect(hasFreshWater(tile)).toBe(expected);
          if (expected) fresh++;
        }
        // Rivers alone guarantee some; a map with none would mean the pass
        // silently did nothing.
        expect(fresh).toBeGreaterThan(0);
      }
    }
  });

  it('survives a JSON round-trip with the rest of the map', () => {
    const map = generateMap(1234, 'duel');
    const clone = JSON.parse(JSON.stringify(map)) as GameMap;
    expect(clone).toEqual(map);
    expect(clone.tiles.some((t) => t.riverEdges !== 0)).toBe(true);
    expect(clone.tiles.some((t) => t.freshwater)).toBe(true);
  });
});
