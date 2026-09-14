import { describe, expect, it } from 'vitest';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { createMap } from '../../src/sim/map';
import { createTileSurfaceSampler } from '../../src/render3d/paintedTileSurface';
// @ts-expect-error Approved terrain modules remain JavaScript.
import { prepareTerrainMap, centre } from '../../src/terrainStudy/surface.js';
// @ts-expect-error Approved terrain modules remain JavaScript.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';
// @ts-expect-error Approved discovery composition remains JavaScript.
import { createSiteLayout } from '../../src/terrainStudy/siteLayout.js';

describe('local terrain contacts', () => {
  it('matches raycast heights on flat ground, overlapping hills, banks and water', () => {
    const map = createMap({ width: 5, height: 5, terrain: 'grassland' });
    map.tiles[12]!.hills = true; map.tiles[13]!.hills = true;
    map.tiles[6]!.riverEdges = 1; map.tiles[7]!.riverEdges = 1 << 3;
    map.tiles[11]!.terrain = 'coast';
    const prepared = prepareTerrainMap(map, { wrap: true }), ray = new Raycaster();
    for (const cell of [6, 11, 12, 13, 18]) {
      const tile = prepared.tiles[cell], c = centre(tile), [top, skirt] = terrainMesh(tile);
      const material = new MeshBasicMaterial(), mesh = new Mesh(top, material); mesh.updateMatrixWorld();
      const sample = createTileSurfaceSampler(top, c.x, c.z);
      try {
        for (let ix = -8; ix <= 8; ix++) for (let iz = -8; iz <= 8; iz++) {
          const x = ix * .117, z = iz * .117;
          ray.set(new Vector3(c.x + x, 5, c.z + z), new Vector3(0, -1, 0));
          const hit = ray.intersectObject(mesh, false)[0], actual = sample(x, z);
          if (hit) expect(actual).toBeCloseTo(hit.point.y, 6); else expect(actual).toBeUndefined();
        }
        // A full ruin search produces the same piece positions and supports.
        const fromRay = (x: number, z: number): number => {
          ray.set(new Vector3(c.x + x, 5, c.z + z), new Vector3(0, -1, 0));
          return ray.intersectObject(mesh, false)[0]?.point.y ?? .12;
        };
        if (cell === 12) {
          const a = createSiteLayout(tile, 'ruins', fromRay), b = createSiteLayout(tile, 'ruins', (x: number, z: number) => sample(x, z) ?? .12);
          expect(b.pieces.length).toBe(a.pieces.length);
          for (let i = 0; i < a.pieces.length; i++) for (const key of ['x', 'z', 'y', 'bottom', 'scale', 'angle'])
            expect(b.pieces[i][key]).toBeCloseTo(a.pieces[i][key], 6);
        }
      } finally { top.dispose(); skirt.dispose(); material.dispose(); }
    }
  });
});
