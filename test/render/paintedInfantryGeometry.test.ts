import { describe, expect, it } from 'vitest';
// @ts-expect-error The approved study packer remains JavaScript.
import { packUnitAsset } from '../../src/terrainStudy/unitAssets.js';
// @ts-expect-error The approved shared study sculpts remain JavaScript.
import { createPrimitiveUnitScene } from '../../src/terrainStudy/primitiveUnitModels.js';
import { Box3, Color, Mesh, MeshBasicMaterial, Raycaster, Vector3, type BufferGeometry, type Group, type MeshStandardMaterial } from 'three';

const originalTypes = ['warrior', 'spearman', 'horseman', 'archer', 'horseArcher', 'worker', 'prophet', 'scout', 'settler', 'trader', 'greatPerson', 'warElephant'];
const variants = ['swordsman', 'legionary', 'longswordsman', 'fireLance', 'khopesh', 'eagleWarrior'];
type Packed = { fixed: BufferGeometry; owner: BufferGeometry; contacts: [number, number, number][]; radius: number; height: number };
const pack = (type: string, family = 'scholar'): Packed => packUnitAsset(createPrimitiveUnitScene(type, { family })) as Packed;
const dispose = (model: Packed): void => { model.fixed.dispose(); model.owner.dispose(); };
const baseline: Record<string, string> = {
  // September 14 interaction ruling: warrior equipment becomes a club, no shield.
  warrior: '97969:1008431b', spearman: '88932:e9ad89c5', horseman: '90872:8c34db48', archer: '103777:ead32659',
  horseArcher: '95166:56f83b84', worker: '80641:95914e55', prophet: '113041:ffad547e', scout: '162055:130cced9',
  settler: '86978:c90aadbc', trader: '85859:feabe1c6', greatPerson: '120145:d0d28c93', warElephant: '130298:65087db2',
  'greatPerson:artist': '122198:bbd42d04', 'greatPerson:engineer': '119005:3c41ec50',
  'greatPerson:merchant': '118184:57185a8e', 'greatPerson:general': '133946:ee9b0b9b',
};
const infantryBaseline: Record<string, string> = {
  swordsman: '115362:f2a0dc39', legionary: '126466:5d280b1a', longswordsman: '117170:4e86595c',
  fireLance: '116141:5a5836a3', khopesh: '128993:1915e101', eagleWarrior: '153586:2851e4e9',
};
// Captured before the infantry batch, with only the separately ruled warrior
// club revision updated. Both packed roles, indices, contacts and bounds count.
function hash(model: Packed): string {
  let h = 2166136261, bytes = 0;
  for (const geometry of [model.fixed, model.owner]) {
    for (const stream of [...Object.values(geometry.attributes).map(attribute => attribute.array), geometry.index!.array]) {
      for (const byte of new Uint8Array(stream.buffer, stream.byteOffset, stream.byteLength)) { h = Math.imul(h ^ byte, 16777619); bytes++; }
    }
  }
  for (const byte of new TextEncoder().encode(JSON.stringify([model.contacts, model.radius, model.height]))) { h = Math.imul(h ^ byte, 16777619); bytes++; }
  return `${bytes}:${(h >>> 0).toString(16)}`;
}
function scenePart(scene: Group, name: string): Mesh<BufferGeometry, MeshStandardMaterial> {
  const part = scene.getObjectByName(name) as Mesh<BufferGeometry, MeshStandardMaterial>;
  expect(part, name).toBeDefined(); return part;
}
function disposeScene(scene: Group): void {
  const resources = new Set<{ dispose(): void }>();
  scene.traverse(object => { if (object instanceof Mesh) { resources.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material); } });
  for (const resource of resources) resource.dispose();
}

describe('painted infantry variants around the accepted warrior', () => {
  it('preserves the recorded packed bytes for all accepted pieces, with the ruled warrior club revision', () => {
    expect(Object.keys(baseline)).toHaveLength(originalTypes.length + 4);
    for (const [key, expected] of Object.entries(baseline)) {
      const [type, family = 'scholar'] = key.split(':');
      const model = pack(type!, family);
      try { expect(hash(model), key).toBe(expected); } finally { dispose(model); }
    }
  });

  it('gives only the warrior a stout club without a sword or shield and preserves its approved helmet', () => {
    const scene = createPrimitiveUnitScene('warrior') as Group, spearman = createPrimitiveUnitScene('spearman') as Group;
    try {
      expect(scene.children.some(part => /shield|sword/i.test(part.name))).toBe(false);
      const club = scenePart(scene, 'Warrior carved wooden club'), position = club.geometry.getAttribute('position');
      const widthAt = (low: number, high: number): number => {
        let radius = 0;
        for (let i = 0; i < position.count; i++) if (position.getY(i) >= low && position.getY(i) <= high) radius = Math.max(radius, Math.hypot(position.getX(i), position.getZ(i)));
        return radius * 2;
      };
      expect(widthAt(.35, .57)).toBeGreaterThan(widthAt(.06, .20) * 2.5);
      expect(club.material.name).toBe('Warm tool wood'); expect(club.material.transparent).toBe(false); expect(club.material.opacity).toBe(1);
      expect(scene.getObjectByName('Warrior simple club')!.children).toHaveLength(3);
      for (const name of ['Simple augur cap', 'Gilt cap brim']) {
        const actual = scenePart(scene, name), expected = scenePart(spearman, name);
        expect(actual.position.toArray()).toEqual(expected.position.toArray());
        expect(actual.quaternion.toArray()).toEqual(expected.quaternion.toArray());
        expect(actual.material.color).toEqual(expected.material.color);
        for (const [attribute, values] of Object.entries(expected.geometry.attributes)) expect(actual.geometry.getAttribute(attribute).array).toEqual(values.array);
      }
      const packed = pack('warrior');
      try {
        expect(packed.radius).toBeLessThan(.34); expect(packed.height).toBeCloseTo(1.0314, 5);
      } finally { dispose(packed); }
    } finally { disposeScene(scene); disposeScene(spearman); }
  });

  it('keeps the exact plinth, body, ivory head and owner material channels beneath every variant', () => {
    const warrior = createPrimitiveUnitScene('warrior') as Group;
    const common = ['Gilt plinth', 'Enamel base', 'Ivory base bead', 'Turned enamel robe', 'Hem shadow', 'Gilt hem',
      'Small collar bead', 'Ivory neck', 'Single diamond insignia', 'Faceted ivory face', 'Small carved nose',
      ...Array.from({ length: 6 }, (_, i) => `Gilt piping ${i}`)];
    try {
      for (const type of [...variants, 'phalanx', 'spearWall', 'pikeman', 'fubing', 'ponticPeltast', 'bowman', 'compositeBowman', 'crossbowman', 'slinger']) {
        const scene = createPrimitiveUnitScene(type) as Group;
        try {
          expect(scene.scale.toArray()).toEqual(warrior.scale.toArray());
          for (const name of common) {
            const actual = scenePart(scene, name), expected = scenePart(warrior, name);
            expect(actual.position.toArray()).toEqual(expected.position.toArray());
            expect(actual.quaternion.toArray()).toEqual(expected.quaternion.toArray());
            expect(actual.scale.toArray()).toEqual(expected.scale.toArray());
            expect(actual.material.name).toBe(expected.material.name); expect(actual.material.color).toEqual(expected.material.color);
            expect(actual.geometry.index?.array).toEqual(expected.geometry.index?.array);
            for (const [attribute, values] of Object.entries(expected.geometry.attributes)) expect(actual.geometry.getAttribute(attribute).array).toEqual(values.array);
          }
          scene.traverse(object => {
            if (!(object instanceof Mesh)) return;
            expect(object.scale.x * object.scale.y * object.scale.z).toBeGreaterThan(0);
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) expect(['Owner enamel', 'Owner turned recess', 'Warm ivory', 'Antique gold', 'Incised detail']).toContain(material.name);
          });
        } finally { disposeScene(scene); }
      }
    } finally { disposeScene(warrior); }
  });

  it('packs six distinct compact indexed variants with identical warrior ground contacts and finite pigments', () => {
    const warrior = pack('warrior'), unique = new Set<string>();
    try {
      for (const type of variants) {
        const model = pack(type), repeated = pack(type);
        try {
          expect(hash(model)).toBe(hash(repeated)); unique.add(hash(model));
          expect(hash(model), type).toBe(infantryBaseline[type]);
          expect(model.contacts).toEqual(warrior.contacts);
          expect(model.height).toBeLessThan(warrior.height + .1); expect(model.radius).toBeLessThan(.34);
          expect(model.height).toBeGreaterThan(.90); expect(model.radius).toBeGreaterThan(.26);
          let triangles = 0;
          for (const geometry of [model.fixed, model.owner]) {
            expect(geometry.index).not.toBeNull(); expect(geometry.groups).toHaveLength(0);
            const position = geometry.getAttribute('position');
            for (const attribute of ['position', 'normal', 'color', 'uv']) {
              const values = geometry.getAttribute(attribute);
              expect(values.count).toBe(position.count); expect([...values.array].every(Number.isFinite)).toBe(true);
            }
            expect(geometry.boundingBox!.min.y).toBeGreaterThanOrEqual(-1e-6);
            triangles += geometry.index!.count / 3;
          }
          expect(triangles).toBeLessThan(4500);
          const pigment = model.fixed.getAttribute('color');
          for (const color of [new Color('#e8d8b2'), new Color('#b69045')]) expect(Array.from({ length: pigment.count }, (_, i) => i).some(i =>
            Math.abs(pigment.getX(i) - color.r) + Math.abs(pigment.getY(i) - color.g) + Math.abs(pigment.getZ(i) - color.b) < 1e-6)).toBe(true);
        } finally { dispose(model); dispose(repeated); }
      }
      expect(unique.size).toBe(6);
    } finally { dispose(warrior); }
  });

  it('gives the equipment different silhouettes instead of differentiating variants by color', () => {
    const scenes = Object.fromEntries(variants.map(type => [type, createPrimitiveUnitScene(type) as Group]));
    const material = new MeshBasicMaterial();
    try {
      const size = (type: string, name: string): Vector3 => new Box3().setFromObject(scenePart(scenes[type]!, name)).getSize(new Vector3());
      const short = size('swordsman', 'Swordsman pointed ivory blade'), long = size('longswordsman', 'Longswordsman pointed ivory blade');
      expect(long.y).toBeGreaterThan(short.y * 1.25);
      expect(size('legionary', 'Legionary bowed enamel shield').y).toBeGreaterThan(.37);
      expect(size('legionary', 'Legionary restrained enamel crest').y).toBeLessThan(.16);
      expect(scenePart(scenes.longswordsman!, 'Longswordsman dark visor slit -1').material.name).toBe('Incised detail');
      expect(size('fireLance', 'Fire lance ivory tube').y).toBeGreaterThan(.24);
      expect(scenePart(scenes.fireLance!, 'Fire lance dark open bore').material.name).toBe('Incised detail');
      const curved = scenePart(scenes.khopesh!, 'Khopesh curved ivory blade').geometry;
      const probe = new Mesh(curved, material), ray = new Raycaster(new Vector3(.14, .36, 1), new Vector3(0, 0, -1));
      expect(ray.intersectObject(probe).length).toBeGreaterThan(0);
      ray.ray.origin.set(.07, .39, 1); expect(ray.intersectObject(probe)).toHaveLength(0);
      const eagle = scenes.eagleWarrior!;
      expect(size('eagleWarrior', 'Eagle warrior carved ivory beak').z).toBeGreaterThan(.14);
      expect(scenePart(eagle, 'Eagle warrior swept enamel cheek feather -1').geometry.getAttribute('position').count).toBeGreaterThan(20);
      expect(eagle.children.filter(child => child.name.startsWith('Eagle warrior incised club edge'))).toHaveLength(8);
    } finally { for (const scene of Object.values(scenes)) disposeScene(scene); material.dispose(); }
  });
});
