import { BufferGeometry, Float32BufferAttribute } from 'three';
import { HEX_DIRECTIONS } from '../sim/hex';
import { axialToOffset, getTileAt, offsetToAxial, type GameMap } from '../sim/map';
import { cellCenter, tileTopY } from './layout';
import { VIEW3D } from './lookData';
import { samplePaintedWorld } from './paintedSurface';

type Cell = { col: number; row: number };
export interface MovementEdge { cell: Cell; side: number }

/** The frontier of the supplied movement set, including holes and cylindrical wrap. */
export function movementEdges(map: GameMap, cells: readonly Cell[], origin?: Cell | null): MovementEdge[] {
  const region = new Map<number, Cell>();
  // No range means no boundary, even if a spent unit remains selected.
  if (!cells.length) return [];
  for (const cell of [...cells, ...(origin ? [origin] : [])]) {
    const tile = getTileAt(map, cell.col, cell.row);
    if (tile) region.set(tile.row * map.width + tile.col, tile);
  }
  const edges: MovementEdge[] = [];
  for (const cell of region.values()) {
    const hex = offsetToAxial(cell.col, cell.row);
    HEX_DIRECTIONS.forEach((d, side) => {
      const next = axialToOffset({ q: hex.q + d.q, r: hex.r + d.r });
      const tile = getTileAt(map, next.col, next.row);
      if (!tile || !region.has(tile.row * map.width + tile.col)) edges.push({ cell, side });
    });
  }
  return edges;
}

/** Joined, terrain-following ink. One shared buffer for the whole frontier. */
export function movementBoundaryGeometry(map: GameMap, edges: readonly MovementEdge[], width: number): BufferGeometry {
  const positions: number[] = [], radius = VIEW3D.board.hexRadius;
  const heights = new Map<string, number>();
  const point = (x: number, z: number, fallback: number): number[] => {
    const key = `${x.toFixed(5)},${z.toFixed(5)}`;
    let y = heights.get(key);
    if (y === undefined) { y = samplePaintedWorld(map, x, z) ?? fallback; heights.set(key, y); }
    return [x, y + VIEW3D.overlay.lift, z];
  };
  for (const {cell, side} of edges) {
    const center = cellCenter(cell.col, cell.row), tile = getTileAt(map, cell.col, cell.row)!;
    const fallback = tileTopY(tile), a = (side * 60 - 30) * Math.PI / 180, b = a + Math.PI / 3;
    const x0 = center.x + Math.cos(a)*radius, z0 = center.z + Math.sin(a)*radius;
    const x1 = center.x + Math.cos(b)*radius, z1 = center.z + Math.sin(b)*radius;
    const dx = x1-x0, dz = z1-z0, length = Math.hypot(dx,dz);
    const nx = -dz/length*width/2, nz = dx/length*width/2;
    // Samples keep a frontier crossing a large hill attached to its relief.
    for (let i=0; i<4; i++) {
      const t=i/4, u=(i+1)/4;
      const p=point(x0+dx*t+nx,z0+dz*t+nz,fallback), q=point(x0+dx*t-nx,z0+dz*t-nz,fallback);
      const r=point(x0+dx*u+nx,z0+dz*u+nz,fallback), s=point(x0+dx*u-nx,z0+dz*u-nz,fallback);
      positions.push(...p,...q,...r,...q,...s,...r);
    }
    // Round joins close convex and concave corners without protruding miters.
    for (const [x,z] of [[x0,z0],[x1,z1]]) for (let i=0; i<8; i++) {
      const p=i*Math.PI/4, q=(i+1)*Math.PI/4;
      positions.push(...point(x!,z!,fallback),
        ...point(x!+Math.cos(p)*width/2,z!+Math.sin(p)*width/2,fallback),
        ...point(x!+Math.cos(q)*width/2,z!+Math.sin(q)*width/2,fallback));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  return geometry;
}
