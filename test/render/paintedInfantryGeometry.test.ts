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
  warrior: '89222:98ad0457', spearman: '81471:ba38770', horseman: '90974:de35941b', archer: '98495:34ad41ee',
  horseArcher: '95267:35f06529', worker: '76146:de020126', prophet: '99686:7b481d5f', scout: '86410:b0b71f65',
  settler: '89830:fc38728', trader: '85595:6d19f0de', greatPerson: '123886:49f016ea', warElephant: '130221:986c3830',
  'greatPerson:artist': '125851:4ee7ffc0', 'greatPerson:engineer': '122790:40abc8b',
  'greatPerson:merchant': '121926:1d2ecc63', 'greatPerson:general': '137686:59d42dd3',
};
const infantryBaseline: Record<string, string> = {
  swordsman: '103218:86867ece', legionary: '114323:fb4bff57', longswordsman: '103814:ec2f9439',
  fireLance: '103998:5cebc839', khopesh: '116763:2f0ce6ce', eagleWarrior: '141442:eb34b950',
};
// Cut again on 2026-11-15, after the user's readability rulings on every kind of piece: bolder tools, helmets in the
// body's colour, shorter lances and staffs, no nose, one body height, the tool not counted in the height, and parts in the seat's second colour. These are the
// pieces of the first age (`tier` 0) packed in two roles. Both roles, indices, contacts and bounds count.
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
  it('preserves the recorded packed bytes for all accepted pieces, as cut after the readability rulings', () => {
    expect(Object.keys(baseline)).toHaveLength(originalTypes.length + 4);
    for (const [key, expected] of Object.entries(baseline)) {
      const [type, family = 'scholar'] = key.split(':');
      const model = pack(type!, family);
      try { expect(hash(model), key).toBe(expected); } finally { dispose(model); }
    }
  });

  it('gives only the warrior a stout club without a sword or shield, under the helmet every soldier wears', () => {
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
      for (const name of ['Steel helmet dome', 'Owner brow band', 'Steel nasal bar', 'Steel cheek guard -1']) {
        const actual = scenePart(scene, name), expected = scenePart(spearman, name);
        expect(actual.position.toArray()).toEqual(expected.position.toArray());
        expect(actual.quaternion.toArray()).toEqual(expected.quaternion.toArray());
        expect(actual.material.color).toEqual(expected.material.color);
        for (const [attribute, values] of Object.entries(expected.geometry.attributes)) expect(actual.geometry.getAttribute(attribute).array).toEqual(values.array);
      }
      // The helmet is the seat's first colour, the same tone as the robe (the user, 2026-11-15: "lets just have the
      // helmets be the same color, they don't need to be darker"). Its brow band is in the second colour.
      // Since the first playtest the helmet is ivory and its brow band is in the seat's first colour (the user, 2026-11-16:
      // "could we have the helmets be white again, with the primary color of the player as an accent color?").
      expect(scenePart(scene, 'Steel helmet dome').material.name).toBe('Warm ivory');
      expect(scenePart(scene, 'Owner brow band').material.name).toBe('Owner enamel');
      // The spearman's helmet has a spike, so the two classes differ in outline.
      expect(spearman.getObjectByName('Steel helmet spike')).toBeDefined(); expect(scene.getObjectByName('Steel helmet spike')).toBeUndefined();
      const packed = pack('warrior');
      try {
        // The height is the top of the helmet. The club stands beside it and does not count.
        const dome = new Box3().setFromObject(scenePart(scene, 'Steel helmet dome'));
        expect(packed.radius).toBeLessThan(.34); expect(packed.height).toBeCloseTo(dome.max.y, 5);
      } finally { dispose(packed); }
    } finally { disposeScene(scene); disposeScene(spearman); }
  });

  it('keeps the exact plinth, body, ivory head and owner material channels beneath every variant', () => {
    // The first age is plain: a plinth and a hem in the second colour. The last age adds a collar, an insignia,
    // piping, a waist band and a mantle. No piece has a nose.
    const plain = ['Trim plinth', 'Enamel base', 'Ivory base bead', 'Turned enamel robe', 'Hem shadow', 'Trim hem', 'Ivory neck', 'Faceted ivory face'];
    const rich = [...plain, 'Trim collar bead', 'Single diamond insignia', 'Trim waist band', 'Trim shoulder mantle', ...Array.from({ length: 6 }, (_, i) => `Trim piping ${i}`)];
    for (const [tier, common] of [[0, plain], [3, rich]] as const) {
      const warrior = createPrimitiveUnitScene('warrior', { tier }) as Group;
      try {
        for (const name of rich) expect(warrior.getObjectByName(name) !== undefined, `${tier}: ${name}`).toBe(common.includes(name));
        for (const type of [...variants, 'phalanx', 'spearWall', 'pikeman', 'fubing', 'ponticPeltast', 'bowman', 'compositeBowman', 'crossbowman', 'slinger']) {
          const scene = createPrimitiveUnitScene(type, { tier }) as Group;
          try {
            expect(scene.scale.toArray()).toEqual(warrior.scale.toArray());
            expect(scene.getObjectByName('Small carved nose')).toBeUndefined();
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
              for (const material of materials) expect(['Owner enamel', 'Owner turned recess', 'Trim gilt', 'Warm ivory', 'Antique gold', 'Incised detail']).toContain(material.name);
            });
          } finally { disposeScene(scene); }
        }
      } finally { disposeScene(warrior); }
    }
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
          // The tools are bolder, so a shield or a curved blade reaches further out than the warrior's club.
          expect(model.height).toBeLessThan(warrior.height + .1); expect(model.radius).toBeLessThan(.40);
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
      // Sizes are in the piece's own units, before the scale that brings it to the board.
      const size = (type: string, name: string): Vector3 => new Box3().setFromObject(scenePart(scenes[type]!, name)).getSize(new Vector3()).divide(scenes[type]!.scale);
      const short = size('swordsman', 'Swordsman pointed ivory blade'), long = size('longswordsman', 'Longswordsman pointed ivory blade');
      // A tool that stands far over the head is shortened a little, so the long blade leads by less than it did.
      expect(long.y).toBeGreaterThan(short.y * 1.15);
      expect(size('legionary', 'Legionary bowed enamel shield').y).toBeGreaterThan(.37);
      expect(size('legionary', 'Legionary restrained trim crest').y).toBeLessThan(.16);
      expect(scenePart(scenes.longswordsman!, 'Longswordsman dark visor slit -1').material.name).toBe('Incised detail');
      expect(size('fireLance', 'Fire lance ivory tube').y).toBeGreaterThan(.24);
      expect(scenePart(scenes.fireLance!, 'Fire lance dark open bore').material.name).toBe('Incised detail');
      const curved = scenePart(scenes.khopesh!, 'Khopesh curved ivory blade').geometry;
      const probe = new Mesh(curved, material), ray = new Raycaster(new Vector3(.14, .36, 1), new Vector3(0, 0, -1));
      expect(ray.intersectObject(probe).length).toBeGreaterThan(0);
      ray.ray.origin.set(.07, .39, 1); expect(ray.intersectObject(probe)).toHaveLength(0);
      const eagle = scenes.eagleWarrior!;
      // The beak is on the head, and the head and body are a little slimmer than they were.
      expect(size('eagleWarrior', 'Eagle warrior carved ivory beak').z).toBeGreaterThan(.12);
      expect(scenePart(eagle, 'Eagle warrior swept enamel cheek feather -1').geometry.getAttribute('position').count).toBeGreaterThan(20);
      expect(eagle.children.filter(child => child.name.startsWith('Eagle warrior incised club edge'))).toHaveLength(8);
    } finally { for (const scene of Object.values(scenes)) disposeScene(scene); material.dispose(); }
  });
});
