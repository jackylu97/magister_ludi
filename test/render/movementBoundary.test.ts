import { describe, expect, it } from 'vitest';
import { createMap, offsetToAxial, axialToOffset } from '../../src/sim/map';
import { HEX_DIRECTIONS } from '../../src/sim/hex';
import { movementEdges, movementBoundaryGeometry } from '../../src/render3d/movementBoundary';

describe('movement frontier', () => {
  const map = createMap({width:12,height:10,terrain:'grassland'});
  it('omits shared edges, including across the map seam', () => {
    expect(movementEdges(map,[{col:2,row:2}])).toHaveLength(6);
    expect(movementEdges(map,[{col:2,row:2},{col:3,row:2}])).toHaveLength(10);
    expect(movementEdges(map,[{col:0,row:2},{col:11,row:2}])).toHaveLength(10);
    expect(movementEdges(map,[{col:0,row:2},{col:12,row:2}])).toHaveLength(6);
  });
  it('includes the selected origin without filling unreachable holes', () => {
    const origin={col:5,row:4}, hex=offsetToAxial(origin.col,origin.row);
    const ring=HEX_DIRECTIONS.map(d=>axialToOffset({q:hex.q+d.q,r:hex.r+d.r}));
    expect(movementEdges(map,ring)).toHaveLength(24);
    expect(movementEdges(map,ring,origin)).toHaveLength(18);
    expect(movementEdges(map,[],origin)).toHaveLength(0);
  });
  it('retains isolated islands and edges at the north boundary', () => {
    expect(movementEdges(map,[{col:2,row:0},{col:8,row:5}])).toHaveLength(12);
  });
  it('produces finite terrain ribbons with no triangles filling tile centers', () => {
    const geometry=movementBoundaryGeometry(map,movementEdges(map,[{col:0,row:0}]),.045);
    const positions=geometry.getAttribute('position');
    for(let i=0;i<positions.count;i++) {
      expect(Number.isFinite(positions.getY(i))).toBe(true);
      expect(Math.hypot(positions.getX(i),positions.getZ(i))).toBeGreaterThan(.8);
    }
    geometry.dispose();
  });
});
