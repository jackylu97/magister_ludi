import { describe, expect, it } from 'vitest';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
// @ts-expect-error The shared terrain art remains JavaScript.
import { createLumbermillGeometry } from '../../src/terrainStudy/lumbermillGeometry.js';

describe('painted lumbermill sculpt', () => {
  it('is a deterministic compact kit with complete instancing attributes', () => {
    const first = createLumbermillGeometry(), second = createLumbermillGeometry();
    try {
      for (const name of ['lumbermill', 'lumber-stockpile']) {
        const geometry = first[name], repeated = second[name];
        expect(geometry.name).toBe(name);
        expect(geometry.userData.paintedWorkAsset).toBe(name);
        expect(geometry.index.count / 3).toBeLessThan(3000);
        for (const attribute of ['position', 'normal', 'color', 'uv']) {
          expect(geometry.getAttribute(attribute).count).toBe(geometry.getAttribute('position').count);
          expect([...geometry.getAttribute(attribute).array].every(Number.isFinite)).toBe(true);
          expect(geometry.getAttribute(attribute).array).toEqual(repeated.getAttribute(attribute).array);
        }
        expect(geometry.boundingBox.min.y).toBeGreaterThanOrEqual(-1e-6);
        expect(geometry.boundingBox.max.y).toBeLessThan(.5);
        expect(geometry.boundingBox.max.z - geometry.boundingBox.min.z).toBeLessThan(.52);
      }
    } finally { for (const kit of [first, second]) for (const geometry of Object.values(kit) as { dispose(): void }[]) geometry.dispose(); }
  });

  it('leaves open working bays beneath its terracotta roof', () => {
    const kit = createLumbermillGeometry(), material = new MeshBasicMaterial({ side: DoubleSide });
    try {
      const shed = new Mesh(kit.lumbermill, material); shed.updateMatrixWorld(true);
      const ray = new Raycaster(new Vector3(.11, .24, 1), new Vector3(0, 0, -1));
      expect(ray.intersectObject(shed)).toHaveLength(0);
      ray.set(new Vector3(.11, 1, 0), new Vector3(0, -1, 0));
      expect(ray.intersectObject(shed)[0]!.point.y).toBeGreaterThan(.38);
    } finally { for (const geometry of Object.values(kit) as { dispose(): void }[]) geometry.dispose(); material.dispose(); }
  });
});
