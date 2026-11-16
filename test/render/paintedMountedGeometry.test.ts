import { describe, expect, it } from 'vitest';
import { Mesh, type Group } from 'three';
// @ts-expect-error The procedural model source remains JavaScript.
import { createPrimitiveUnitScene } from '../../src/terrainStudy/primitiveUnitModels.js';

function dispose(scene: Group) {
  const resources = new Set<{ dispose(): void }>();
  scene.traverse(o => { if (o instanceof Mesh) {
    resources.add(o.geometry);
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) resources.add(material);
  } });
  for (const resource of resources) resource.dispose();
}

describe('mounted chess equipment', () => {
  it('preserves the approved continuous horse, proportions and mounting under each horse variant', () => {
    const baseline = createPrimitiveUnitScene('horseman') as Group;
    // The plinth and the seat's bead are in the seat's second colour. The socket keeps its thin gilt rim.
    const names = ['Continuous ivory knight bust', 'Low enamel knight seat', 'Enamel base', 'Trim plinth', 'Trim seat bead', 'Gilt socket rim',
      'Small knight ear -1', 'Small knight ear 1', 'Engraved eye -1', 'Engraved eye 1'];
    try {
      for (const type of ['cataphract', 'knight', 'knightsTemplar', 'tangCavalry', 'chanyuGuard', 'gendarme', 'mandekalu', 'whistlingArrow', 'xiongnuHorseArcher']) {
        const scene = createPrimitiveUnitScene(type) as Group;
        try {
          scene.updateMatrixWorld(true); baseline.updateMatrixWorld(true);
          // The lance, the shield and the bow do not lift the badge: every horse piece has the horseman's height.
          expect(scene.userData.pieceHeight, type).toBe(baseline.userData.pieceHeight);
          expect(scene.userData.pieceHeight).toBeGreaterThan(.9);
          for (const name of names) {
            const expected = baseline.getObjectByName(name) as Mesh, actual = scene.getObjectByName(name) as Mesh;
            expect(actual, `${type}: ${name}`).toBeInstanceOf(Mesh);
            expect(actual.matrixWorld.elements).toEqual(expected.matrixWorld.elements);
            expect(actual.geometry.index?.array).toEqual(expected.geometry.index?.array);
            for (const [key, attribute] of Object.entries(expected.geometry.attributes)) {
              expect(actual.geometry.getAttribute(key).array).toEqual(attribute.array);
            }
          }
        } finally { dispose(scene); }
      }
    } finally { dispose(baseline); }
  });
});
