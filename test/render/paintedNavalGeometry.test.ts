import { describe, expect, it } from 'vitest';
import { Mesh, type Group } from 'three';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
// @ts-expect-error Shared procedural assets remain JavaScript.
import { createPrimitiveUnitScene } from '../../src/terrainStudy/primitiveUnitModels.js';
import units from '../../data/units.json';

describe('painted naval silhouette contracts', () => {
  it('preserves every naval roster mast count on a hull without a chess plinth', () => {
    const naval = UNIT_TYPE_IDS.filter(type => unitDef(type).category === 'naval');
    expect(naval).toHaveLength(14);
    for (const type of naval) {
      const scene = createPrimitiveUnitScene(type) as Group;
      const names: string[] = [];
      scene.traverse(object => names.push(object.name));
      const def = units.units[type] as { masts?: number };
      expect(names.filter(name => /^Mast \d+$/.test(name)), type).toHaveLength(def.masts!);
      expect(names.filter(name => /^Faceted ivory sail \d+$/.test(name)), type).toHaveLength(def.masts!);
      expect(names).toContain('Carved enamel lower hull');
      expect(names).not.toContain('Gilt plinth');
      scene.traverse(object => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
        }
      });
    }
  });
});
