import { describe, expect, it } from 'vitest';
import { hexDistance, hexKey } from '../../src/sim/hex';
import {
  axialToOffset,
  createMap,
  getTile,
  getTileAt,
  inRows,
  mapNeighbors,
  mapRange,
  offsetToAxial,
  tileHex,
  tileNeighbors,
  wrapCol,
  wrapHex,
  wrappedDistance,
} from '../../src/sim/map';

const map = createMap({ width: 20, height: 11, seed: 1, sizeName: 'test' });

describe('offset <-> axial', () => {
  it('round-trips every cell on the map', () => {
    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
        const axial = offsetToAxial(col, row);
        expect(axialToOffset(axial)).toEqual({ col, row });
      }
    }
  });

  it('round-trips off-map and negative columns too', () => {
    for (let row = -5; row < 5; row++) {
      for (let col = -30; col < 30; col++) {
        expect(axialToOffset(offsetToAxial(col, row))).toEqual({ col, row });
      }
    }
  });

  it('uses odd-r: odd rows shift east by half a hex', () => {
    // Row 0 (even) keeps q === col; row 1 (odd) keeps q === col as well because
    // the shear term ((r - (r & 1)) / 2) is 0 for rows 0 and 1.
    expect(offsetToAxial(4, 0)).toEqual({ q: 4, r: 0 });
    expect(offsetToAxial(4, 1)).toEqual({ q: 4, r: 1 });
    expect(offsetToAxial(4, 2)).toEqual({ q: 3, r: 2 });
    expect(offsetToAxial(4, 3)).toEqual({ q: 3, r: 3 });
  });

  it('keeps offset neighbours adjacent in axial space', () => {
    for (let row = 1; row < map.height - 1; row++) {
      for (let col = 1; col < map.width - 1; col++) {
        const here = offsetToAxial(col, row);
        // The two same-row neighbours are always one step away.
        expect(hexDistance(here, offsetToAxial(col - 1, row))).toBe(1);
        expect(hexDistance(here, offsetToAxial(col + 1, row))).toBe(1);
        // Odd-r rows: the row above contributes cols (col, col+1) on odd rows
        // and (col-1, col) on even rows.
        const shift = row & 1 ? 1 : -1;
        expect(hexDistance(here, offsetToAxial(col, row - 1))).toBe(1);
        expect(hexDistance(here, offsetToAxial(col + shift, row - 1))).toBe(1);
      }
    }
  });
});

describe('wrapCol', () => {
  it('leaves in-range columns alone', () => {
    for (let col = 0; col < map.width; col++) expect(wrapCol(map, col)).toBe(col);
  });

  it('wraps past the east edge', () => {
    expect(wrapCol(map, map.width)).toBe(0);
    expect(wrapCol(map, map.width + 3)).toBe(3);
    expect(wrapCol(map, map.width * 4 + 7)).toBe(7);
  });

  it('wraps past the west edge', () => {
    expect(wrapCol(map, -1)).toBe(map.width - 1);
    expect(wrapCol(map, -map.width)).toBe(0);
    expect(wrapCol(map, -map.width * 3 - 2)).toBe(map.width - 2);
  });

  it('always lands in [0, width)', () => {
    for (let col = -200; col <= 200; col++) {
      const wrapped = wrapCol(map, col);
      expect(wrapped).toBeGreaterThanOrEqual(0);
      expect(wrapped).toBeLessThan(map.width);
    }
  });
});

describe('wrapHex and tile access', () => {
  it('maps out-of-range axial coordinates onto real tiles', () => {
    for (let row = 0; row < map.height; row++) {
      const east = offsetToAxial(map.width + 2, row);
      const wrapped = wrapHex(map, east);
      expect(axialToOffset(wrapped)).toEqual({ col: 2, row });
      expect(getTile(map, east)).toBe(getTileAt(map, 2, row));
    }
  });

  it('returns undefined past the north and south edges', () => {
    expect(getTileAt(map, 3, -1)).toBeUndefined();
    expect(getTileAt(map, 3, map.height)).toBeUndefined();
    expect(inRows(map, -1)).toBe(false);
    expect(inRows(map, map.height - 1)).toBe(true);
  });

  it('gives every tile its own index and consistent axial coordinates', () => {
    expect(map.tiles).toHaveLength(map.width * map.height);
    for (const tile of map.tiles) {
      expect(getTile(map, tileHex(tile))).toBe(tile);
    }
  });
});

describe('mapNeighbors', () => {
  it('gives 6 distinct neighbours in the map interior', () => {
    const h = offsetToAxial(5, 5);
    const ns = mapNeighbors(map, h);
    expect(ns).toHaveLength(6);
    expect(new Set(ns.map(hexKey)).size).toBe(6);
  });

  it('wraps across the seam instead of dropping tiles', () => {
    for (const row of [2, 3, 4, 5]) {
      const west = tileNeighbors(map, getTileAt(map, 0, row)!);
      expect(west.some((t) => t.col === map.width - 1)).toBe(true);
      const east = tileNeighbors(map, getTileAt(map, map.width - 1, row)!);
      expect(east.some((t) => t.col === 0)).toBe(true);
    }
  });

  it('drops neighbours past the poles', () => {
    expect(tileNeighbors(map, getTileAt(map, 5, 0)!)).toHaveLength(4);
    expect(tileNeighbors(map, getTileAt(map, 5, map.height - 1)!)).toHaveLength(4);
  });

  it('is symmetric: if a is a neighbour of b then b is a neighbour of a', () => {
    for (const tile of map.tiles) {
      for (const other of tileNeighbors(map, tile)) {
        expect(tileNeighbors(map, other)).toContain(tile);
      }
    }
  });
});

describe('wrappedDistance', () => {
  it('agrees with plain distance well inside the map', () => {
    const a = offsetToAxial(5, 5);
    const b = offsetToAxial(8, 6);
    expect(wrappedDistance(map, a, b)).toBe(hexDistance(a, b));
  });

  it('is shorter across the seam than the long way round', () => {
    const west = offsetToAxial(1, 4);
    const east = offsetToAxial(map.width - 1, 4);
    const direct = hexDistance(west, east);
    const wrapped = wrappedDistance(map, west, east);
    expect(wrapped).toBeLessThan(direct);
    expect(wrapped).toBe(2);
  });

  it('never exceeds half the map width for same-row tiles', () => {
    for (let col = 0; col < map.width; col++) {
      const d = wrappedDistance(map, offsetToAxial(0, 6), offsetToAxial(col, 6));
      expect(d).toBeLessThanOrEqual(Math.ceil(map.width / 2));
    }
  });

  it('is symmetric and zero on itself', () => {
    for (let col = 0; col < map.width; col += 3) {
      for (let row = 0; row < map.height; row += 2) {
        const a = offsetToAxial(col, row);
        const b = offsetToAxial((col + 7) % map.width, (row + 3) % map.height);
        expect(wrappedDistance(map, a, a)).toBe(0);
        expect(wrappedDistance(map, a, b)).toBe(wrappedDistance(map, b, a));
      }
    }
  });
});

describe('mapRange', () => {
  it('collects 3r^2+3r+1 tiles away from the poles', () => {
    const tiles = mapRange(map, offsetToAxial(10, 5), 2);
    expect(tiles).toHaveLength(3 * 4 + 3 * 2 + 1);
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('never reports the same tile twice, even wrapping a narrow map', () => {
    const narrow = createMap({ width: 4, height: 9 });
    const tiles = mapRange(narrow, offsetToAxial(0, 4), 3);
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('clips at the poles', () => {
    const tiles = mapRange(map, offsetToAxial(10, 0), 1);
    expect(tiles.length).toBeLessThan(7);
    for (const tile of tiles) expect(tile.row).toBeGreaterThanOrEqual(0);
  });
});
