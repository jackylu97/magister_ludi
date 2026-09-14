import { afterEach, describe, expect, it, vi } from 'vitest';
import { Color, ShaderLib, Texture, type BufferGeometry, type MeshStandardMaterial, type WebGLRenderer } from 'three';
import { PaintedUnitKit, type PaintedUnitModel } from '../../src/render3d/paintedUnits';
import { FAMILIES, GREAT_PERSON_IDS, greatPersonDef, type Family } from '../../src/sim/greatPeopleData';
import { UNIT_TYPE_IDS } from '../../src/sim/unitData';
import type { Unit } from '../../src/sim/state';
// @ts-expect-error The approved study packer remains JavaScript.
import { packUnitAsset } from '../../src/terrainStudy/unitAssets.js';
// @ts-expect-error The approved shared study sculpts remain JavaScript.
import { createPrimitiveUnitScene } from '../../src/terrainStudy/primitiveUnitModels.js';
// @ts-expect-error The real shared painted lighting remains JavaScript.
import { createPainterlyStyle } from '../../src/terrainStudy/painterly.js';

const approved = ['warrior', 'spearman', 'horseman', 'archer', 'horseArcher', 'worker', 'prophet', 'scout', 'settler', 'trader', 'greatPerson', 'warElephant'] as const;
const infantryVariants = ['swordsman', 'legionary', 'longswordsman', 'fireLance', 'khopesh', 'eagleWarrior'] as const;
const equipmentVariants = ['phalanx', 'spearWall', 'pikeman', 'fubing', 'ponticPeltast', 'bowman', 'compositeBowman', 'crossbowman', 'slinger'] as const;
const mountedVariants = ['cataphract', 'knight', 'knightsTemplar', 'tangCavalry', 'chanyuGuard', 'gendarme', 'mandekalu', 'whistlingArrow', 'xiongnuHorseArcher', 'camelArcher', 'chariot', 'scythedChariot', 'chariotArcher'] as const;
const navalVariants = ['trireme', 'bireme', 'galley', 'caravel', 'corvette', 'alexandrianGalley', 'warGalley', 'towerShip', 'carrack', 'shipOfTheLine', 'treasureShip', 'fireShip', 'gunGalley', 'frigate'] as const;
const implemented = [...approved, ...infantryVariants, ...equipmentVariants, ...mountedVariants, 'catapult', 'trebuchet', ...navalVariants, 'augur', 'apostle', 'inquisitor', 'canoness', 'rihlaCaravan'] as const;
const kits: PaintedUnitKit[] = [];
const make = (register: (material: MeshStandardMaterial) => void = () => {}): PaintedUnitKit => {
  const kit = new PaintedUnitKit(register); kits.push(kit); return kit;
};
const personFor = (family: Family) => GREAT_PERSON_IDS.find(id => greatPersonDef(id).family === family)!;
const compile = (material: MeshStandardMaterial): Parameters<MeshStandardMaterial['onBeforeCompile']>[0] => {
  const shader = {
    uniforms: {}, vertexShader: ShaderLib.standard.vertexShader, fragmentShader: ShaderLib.standard.fragmentShader,
  } as Parameters<MeshStandardMaterial['onBeforeCompile']>[0];
  material.onBeforeCompile(shader, {} as WebGLRenderer);
  return shader;
};
afterEach(() => { for (const kit of kits.splice(0)) kit.dispose(); vi.restoreAllMocks(); });

describe('production painted unit kit', () => {
  it('resolves the approved types and infantry review, preserving their exact indexed source geometry and contacts', () => {
    const kit = make();
    for (const type of UNIT_TYPE_IDS) expect(kit.resolve({ type }) !== null).toBe((implemented as readonly string[]).includes(type));
    const yaw: Partial<Record<Unit['type'], number>> = { rihlaCaravan: -.62, catapult: -.60, trebuchet: -.60, warrior: -.16, horseman: -.35, horseArcher: -.35, warElephant: -.58, trader: -.62, settler: 2.92,
      ...Object.fromEntries(navalVariants.map(type => [type, -.65])),
      ...Object.fromEntries(infantryVariants.map(type => [type, -.16])),
      ...Object.fromEntries(mountedVariants.map(type => [type, -.35])),
    };
    for (const type of implemented) {
      const model = kit.resolve({ type })!;
      const source = packUnitAsset(createPrimitiveUnitScene(type)) as PaintedUnitModel & { fixed: BufferGeometry; owner: BufferGeometry };
      try {
        expect(kit.resolve({ type }, 'grassland')).toBe(model);
        expect(model.geometry.index).not.toBeNull(); expect(model.geometry.groups).toHaveLength(0);
        expect(model.height).toBe(source.height); expect(model.radius).toBe(source.radius);
        expect(model.yaw).toBe(yaw[type] ?? .12); expect(model.contacts).toEqual(source.contacts);
        const geometry = model.geometry, position = geometry.getAttribute('position');
        for (const name of ['position', 'normal', 'color', 'uv']) {
          const attribute = geometry.getAttribute(name);
          expect(attribute.count).toBe(position.count); expect([...attribute.array].every(Number.isFinite)).toBe(true);
          expect([...attribute.array]).toEqual([...source.fixed.getAttribute(name).array, ...source.owner.getAttribute(name).array]);
        }
        expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 6);
        expect(geometry.boundingBox!.max.y).toBeCloseTo(model.height, 6);
        expect(model.radius).toBeGreaterThan(.2); expect(model.radius).toBeLessThan(.7);
        expect(model.height).toBeGreaterThan(.3); expect(model.height).toBeLessThan(1.8);
        expect(model.contacts.length).toBeGreaterThan(4);
        for (const contact of model.contacts) {
          expect(contact.every(Number.isFinite)).toBe(true);
          expect(contact[1]).toBeGreaterThanOrEqual(-1e-6); expect(contact[1]).toBeLessThan(.002);
          expect(Math.hypot(contact[0], contact[2])).toBeLessThanOrEqual(model.radius + 1e-6);
        }
      } finally { source.fixed.dispose(); source.owner.dispose(); }
    }
  });

  it('keeps fixed ivory and gilt separate from owner enamel on every triangle', () => {
    const kit = make(), ivory = new Color('#e8d8b2'), gold = new Color('#b69045');
    for (const type of implemented) {
      const geometry = kit.resolve({ type })!.geometry, color = geometry.getAttribute('color'), owner = geometry.getAttribute('paintedOwner');
      const fixedColors = new Set<string>(), ownerColors = new Set<string>();
      const key = (r: number, g: number, b: number) => [r, g, b].map(value => value.toFixed(5)).join(',');
      expect(owner.count).toBe(color.count);
      for (let i = 0; i < color.count; i++) {
        const mask = owner.getX(i); expect(mask === 0 || mask === 1).toBe(true);
        (mask ? ownerColors : fixedColors).add(key(color.getX(i), color.getY(i), color.getZ(i)));
      }
      expect(fixedColors.has(key(ivory.r, ivory.g, ivory.b))).toBe(true);
      expect(fixedColors.has(key(gold.r, gold.g, gold.b))).toBe(true);
      expect(ownerColors.has(key(1, 1, 1))).toBe(true);
      expect(ownerColors.size).toBeGreaterThan(1);
      const indices = geometry.index!;
      for (let i = 0; i < indices.count; i += 3) {
        expect(owner.getX(indices.getX(i + 1))).toBe(owner.getX(indices.getX(i)));
        expect(owner.getX(indices.getX(i + 2))).toBe(owner.getX(indices.getX(i)));
      }
    }
  });

  it('uses the real great-person family and preserves five distinct approved emblems', () => {
    const kit = make(), shapes = new Set<string>(), models = new Set<PaintedUnitModel>();
    for (const family of FAMILIES) {
      const person = personFor(family), model = kit.resolve({ type: 'greatPerson', person })!;
      expect(model.geometry.userData.paintedUnitAsset).toBe(`greatPerson:${family}`);
      const secondPerson = GREAT_PERSON_IDS.find(id => id !== person && greatPersonDef(id).family === family)!;
      expect(kit.resolve({ type: 'greatPerson', person: secondPerson })).toBe(model);
      const source = packUnitAsset(createPrimitiveUnitScene('greatPerson', { family })) as { fixed: BufferGeometry; owner: BufferGeometry };
      try {
        expect([...model.geometry.getAttribute('position').array]).toEqual([...source.fixed.getAttribute('position').array, ...source.owner.getAttribute('position').array]);
      } finally { source.fixed.dispose(); source.owner.dispose(); }
      shapes.add(JSON.stringify([...model.geometry.getAttribute('position').array])); models.add(model);
    }
    expect(shapes.size).toBe(5); expect(models.size).toBe(5);
    expect(kit.resolve({ type: 'greatPerson' })).toBe(kit.resolve({ type: 'greatPerson', person: personFor('scholar') }));
    expect(kit.resolve({ type: 'greatPerson', person: 'not-a-person' as Unit['person'] })).toBe(kit.resolve({ type: 'greatPerson' }));
  });

  it('shares one transport for land units afloat and keeps trading caravans on their ordinary model', () => {
    const kit = make(), route = Object.freeze({}) as NonNullable<Unit['trade']>;
    const boat = kit.resolve({ type: 'worker' }, 'coast')!;
    expect(boat.geometry.userData.paintedUnitAsset).toBe('embarked');
    expect(boat.waterborne).toBe(true); expect(boat.yaw).toBe(-.65);
    for (const type of implemented) for (const terrain of ['coast', 'ocean', 'lake'] as const) {
      const afloat = kit.resolve({ type }, terrain)!;
      expect(afloat).toBe((navalVariants as readonly string[]).includes(type) ? kit.resolve({ type }) : boat);
    }
    for (const type of ['trader', 'rihlaCaravan'] as const) {
      const unit = Object.freeze({ type, trade: route }), before = JSON.stringify(unit);
      expect(kit.resolve(unit, 'grassland')).toBe(kit.resolve({ type }));
      expect(kit.resolve(unit, 'coast')).toBe(boat);
      expect(JSON.stringify(unit)).toBe(before);
    }
    expect(kit.resolve({ type: 'worker' }, 'grassland')).not.toBe(boat);
  });

  it('chains the real painted shader once and caches independent owner/routed uniforms per body color', () => {
    const grain = new Texture();
    const style = createPainterlyStyle({}, { setPainted() {} }, grain);
    const register = vi.fn((material: MeshStandardMaterial) => style.register(material));
    const kit = make(register), warrior = kit.resolve({ type: 'warrior' })!, settler = kit.resolve({ type: 'settler' })!;
    const enamel = kit.material(warrior, 0x294979), routed = kit.material(warrior, 0x9baabd);
    try {
      expect(kit.material(settler, 0x294979)).toBe(enamel); expect(register).toHaveBeenCalledTimes(2);
      expect(enamel.color.getHex()).toBe(0xffffff); expect(enamel.vertexColors).toBe(true);
      const shader = compile(enamel), washed = compile(routed), repeated = compile(enamel);
      expect(shader.uniforms.paintGrain.value).toBe(grain);
      expect(shader.uniforms.paintedUnitBodyColor.value).toEqual(new Color(0x294979));
      expect(washed.uniforms.paintedUnitBodyColor.value).toEqual(new Color(0x9baabd));
      expect(shader.uniforms.paintedUnitBodyColor).toBe(repeated.uniforms.paintedUnitBodyColor);
      expect(shader.uniforms.paintedUnitBodyColor).not.toBe(washed.uniforms.paintedUnitBodyColor);
      expect(shader.vertexShader.match(/attribute float paintedOwner;/g)).toHaveLength(1);
      expect(shader.fragmentShader.match(/diffuseColor.rgb \*= mix\(vec3\(1.0\), paintedUnitBodyColor, vPaintedOwner\);/g)).toHaveLength(1);
      expect(shader.fragmentShader.match(/vec3 pigment=diffuseColor.rgb;/g)).toHaveLength(1);
      expect(shader.fragmentShader.indexOf('paintedUnitBodyColor, vPaintedOwner)')).toBeLessThan(shader.fragmentShader.indexOf('vec3 pigment=diffuseColor.rgb;'));
      const key = enamel.customProgramCacheKey();
      expect(routed.customProgramCacheKey()).toBe(key);
      style.setPainted(false); expect(enamel.customProgramCacheKey()).not.toBe(key);
      expect(compile(enamel).fragmentShader).not.toContain('vec3 pigment=diffuseColor.rgb;');
    } finally { grain.dispose(); }
  });

  it('disposes cached geometry and materials once and never recreates them after disposal', () => {
    const kit = make(), warrior = kit.resolve({ type: 'warrior' })!, scholar = kit.resolve({ type: 'greatPerson' })!;
    const material = kit.material(warrior, 0x294979), second = kit.material(scholar, 0xb54832);
    const disposers = [warrior.geometry, scholar.geometry, material, second].map(resource => vi.spyOn(resource, 'dispose'));
    kit.dispose(); kit.dispose();
    for (const dispose of disposers) expect(dispose).toHaveBeenCalledTimes(1);
    expect(kit.resolve({ type: 'warrior' })).toBeNull();
    expect(() => kit.material(warrior, 0x294979)).toThrow('disposed');
  });
});
