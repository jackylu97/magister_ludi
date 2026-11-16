import { afterEach, describe, expect, it, vi } from 'vitest';
import { Color, ShaderLib, Texture, type BufferGeometry, type MeshStandardMaterial, type WebGLRenderer } from 'three';
import { PaintedUnitKit, setUnitArtVariant, unitDecorationTier, type PaintedUnitModel } from '../../src/render3d/paintedUnits';
// @ts-expect-error The alternate designs remain JavaScript.
import { UNIT_VARIANTS, UNIT_VARIANT_IDS } from '../../src/terrainStudy/civilianVariants.js';
import { FAMILIES, GREAT_PERSON_IDS, greatPersonDef, type Family } from '../../src/sim/greatPeopleData';
import { UNIT_TYPE_IDS } from '../../src/sim/unitData';
import type { Unit } from '../../src/sim/state';
// @ts-expect-error The approved study packer remains JavaScript.
import { packUnitAsset } from '../../src/terrainStudy/unitAssets.js';
// @ts-expect-error The approved shared study sculpts remain JavaScript.
import { createPrimitiveUnitScene } from '../../src/terrainStudy/primitiveUnitModels.js';
// @ts-expect-error The real shared painted lighting remains JavaScript.
import { createPainterlyStyle } from '../../src/terrainStudy/painterly.js';
import { overrideNorthStarUnit } from '../../src/render3d/northStarUnits';

// This file pins today's pieces. The swordsman has a north-star model behind `NORTH_STAR_UNITS`
// (test/render/northStarUnits.test.ts covers it), so here it is drawn as today's piece.
overrideNorthStarUnit('swordsman', null);

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
type PackedSource = PaintedUnitModel & { fixed: BufferGeometry; owner: BufferGeometry; trim?: BufferGeometry };
/** The piece as the kit packs it: with its age's decoration, and its second-colour parts as a third geometry. */
const packSource = (type: string, family?: Family): PackedSource =>
  packUnitAsset(createPrimitiveUnitScene(type, { family, tier: unitDecorationTier(type) }), { trim: true }) as PackedSource;
const sourceParts = (source: PackedSource): BufferGeometry[] => [source.fixed, source.owner, ...(source.trim ? [source.trim] : [])];

it('packs the siege elephant as a distinct cached model with the same supported base', () => {
  const kit = make(), original = kit.resolve({ type: 'warElephant' })!, siege = kit.resolve({ type: 'siegeElephant' })!;
  expect(siege).toBe(kit.resolve({ type: 'siegeElephant' }));
  expect(siege).not.toBe(original);
  expect(siege.contacts).toEqual(original.contacts);
  expect(siege.yaw).toBe(original.yaw);
  expect(siege.height).toBeGreaterThan(original.height);
  expect(siege.height).toBeLessThan(original.height * 1.25);
  expect(siege.radius).toBeLessThan(.7);
  for (const attribute of Object.values(siege.geometry.attributes)) {
    expect([...attribute.array].every(Number.isFinite)).toBe(true);
  }
  const mask = siege.geometry.getAttribute('paintedOwner');
  // 0 is fixed ivory and gilt, 1 the seat's first colour, 2 its second colour.
  expect(new Set(mask.array)).toEqual(new Set([0, 1, 2]));
});
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
      const source = packSource(type);
      try {
        expect(kit.resolve({ type }, 'grassland')).toBe(model);
        expect(model.geometry.index).not.toBeNull(); expect(model.geometry.groups).toHaveLength(0);
        expect(model.height).toBe(source.height); expect(model.radius).toBe(source.radius);
        expect(model.yaw).toBe(yaw[type] ?? .12); expect(model.contacts).toEqual(source.contacts);
        const geometry = model.geometry, position = geometry.getAttribute('position');
        for (const name of ['position', 'normal', 'color', 'uv']) {
          const attribute = geometry.getAttribute(name);
          expect(attribute.count).toBe(position.count); expect([...attribute.array].every(Number.isFinite)).toBe(true);
          expect([...attribute.array]).toEqual(sourceParts(source).flatMap(part => [...part.getAttribute(name).array]));
        }
        expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 6);
        // A piece's height is its body and not its tools, and the pieces of one kind share a height. So the
        // height is at most a little over the geometry: a low chariot stands at the horses' height, a catapult at the trebuchet's.
        expect(model.height).toBeLessThanOrEqual(geometry.boundingBox!.max.y + .14);
        expect(model.radius).toBeGreaterThan(.2); expect(model.radius).toBeLessThan(.7);
        expect(model.height).toBeGreaterThan(.3); expect(model.height).toBeLessThan(1.8);
        expect(model.contacts.length).toBeGreaterThan(4);
        for (const contact of model.contacts) {
          expect(contact.every(Number.isFinite)).toBe(true);
          expect(contact[1]).toBeGreaterThanOrEqual(-1e-6); expect(contact[1]).toBeLessThan(.002);
          expect(Math.hypot(contact[0], contact[2])).toBeLessThanOrEqual(model.radius + 1e-6);
        }
      } finally { for (const part of sourceParts(source)) part.dispose(); }
    }
  });

  it('carries the badge at one height on the pieces of one kind, below the tools that stand over them', () => {
    const kit = make(), height = (type: string) => kit.resolve({ type: type as Unit['type'] })!.height;
    const top = (type: string) => kit.resolve({ type: type as Unit['type'] })!.geometry.boundingBox!.max.y;
    for (const kind of [['horseman', 'horseArcher', ...mountedVariants], navalVariants, ['catapult', 'trebuchet'], ['trader', 'rihlaCaravan']]) {
      expect(new Set(kind.map(height)).size, kind[0]).toBe(1);
    }
    expect(kit.resolve({ type: 'worker' }, 'coast')!.height).toBe(height('trireme'));
    // A lance, a spear, a flag, a staff, a throwing beam and a pennant pole stand over the height.
    for (const type of ['knight', 'gendarme', 'spearman', 'pikeman', 'settler', 'scout', 'prophet', 'trebuchet', 'rihlaCaravan', 'alexandrianGalley']) {
      expect(top(type), type).toBeGreaterThan(height(type) + .05);
    }
    // Every foot piece has one body, so their heights differ only by what is on the head.
    const foot = ['warrior', 'worker', 'settler', 'archer', 'swordsman', 'spearman', 'greatPerson'].map(height);
    expect(Math.max(...foot) - Math.min(...foot)).toBeLessThan(.15);
  });

  it('keeps a lance, a pike or a staff near the bounds of its piece, with the longer tool still the taller', () => {
    const kit = make(), over = (type: string): number => {
      const model = kit.resolve({ type: type as Unit['type'] })!;
      return model.geometry.boundingBox!.max.y - model.height;
    };
    // The user, 2026-11-15: "adjust the lance and staff heights so they fit the bounds of the piece a bit better".
    for (const type of ['spearman', 'phalanx', 'pikeman', 'knight', 'gendarme', 'chanyuGuard', 'cataphract', 'prophet', 'apostle', 'inquisitor', 'canoness', 'augur', 'scout', 'settler', 'fireLance']) {
      expect(over(type), type).toBeGreaterThan(.05); expect(over(type), type).toBeLessThan(.40);
    }
    expect(over('pikeman')).toBeGreaterThan(over('phalanx')); expect(over('phalanx')).toBeGreaterThan(over('spearman'));
    expect(over('gendarme')).toBeGreaterThan(over('knight'));
    // The chariot's spear stands under the badge.
    expect(over('chariot')).toBeLessThan(0);
  });

  it('builds every alternate design of the scout and the settler with ground contacts and both colour roles', () => {
    const shapes = new Set<string>();
    for (const type of ['scout', 'settler'] as const) {
      const present = packUnitAsset(createPrimitiveUnitScene(type), { trim: true }) as PackedSource;
      for (const variant of UNIT_VARIANT_IDS[type] as string[]) {
        const packed = packUnitAsset(createPrimitiveUnitScene(type, { variant }), { trim: true }) as PackedSource;
        try {
          expect(packed.contacts.length, `${type} ${variant}`).toBeGreaterThan(4);
          for (const part of [packed.fixed, packed.owner, packed.trim!]) {
            expect(part.index!.count, `${type} ${variant}`).toBeGreaterThan(0);
            for (const attribute of Object.values(part.attributes)) expect([...attribute.array].every(Number.isFinite)).toBe(true);
          }
          // One body height for every design, and a footprint that stays on its hex.
          expect(Math.abs(packed.height - present.height), `${type} ${variant}`).toBeLessThan(.12);
          expect(packed.radius).toBeLessThan(.7);
          shapes.add([...packed.fixed.getAttribute('position').array, ...packed.owner.getAttribute('position').array].join(','));
          // No alternate wears a helmet or a nose.
          const names: string[] = [];
          createPrimitiveUnitScene(type, { variant }).traverse((object: { name: string }) => names.push(object.name));
          expect(names.some(name => /helmet|nose/i.test(name))).toBe(false);
        } finally { for (const part of sourceParts(packed)) part.dispose(); }
      }
      // The game draws the present design until the user chooses another.
      expect(UNIT_VARIANTS[type]).toBe('a');
      const chosen = packUnitAsset(createPrimitiveUnitScene(type, { variant: 'a' }), { trim: true }) as PackedSource;
      expect([...chosen.fixed.getAttribute('position').array]).toEqual([...present.fixed.getAttribute('position').array]);
      for (const part of [...sourceParts(present), ...sourceParts(chosen)]) part.dispose();
      expect(() => createPrimitiveUnitScene(type, { variant: 'z' })).toThrow('variant');
    }
    expect(shapes.size).toBe(8);
    // The test scene marks one unit with a design. An unmarked unit keeps the present one.
    const kit = make(), marked = { type: 'scout' } as const, plain = { type: 'scout' } as const;
    setUnitArtVariant(marked, 'c');
    expect(kit.resolve(marked)!.geometry.userData.paintedUnitAsset).toBe('scout:c');
    expect(kit.resolve(plain)!.geometry.userData.paintedUnitAsset).toBe('scout');
    expect(kit.resolve(marked, 'coast')!.geometry.userData.paintedUnitAsset).toBe('embarked');
  });

  it('gives a later age more decoration in the second colour, and every piece some', () => {
    const trimCount = (type: string, tier: number): number => {
      const packed = packUnitAsset(createPrimitiveUnitScene(type, { tier }), { trim: true }) as PackedSource;
      try { return packed.trim ? packed.trim.index!.count / 3 : 0; } finally { for (const part of sourceParts(packed)) part.dispose(); }
    };
    for (const type of implemented) expect(trimCount(type, unitDecorationTier(type)), type).toBeGreaterThan(0);
    for (const type of ['warrior', 'spearman', 'archer', 'chariot', 'catapult', 'trebuchet', 'trireme', 'carrack', 'frigate', 'trader'] as const) {
      expect(trimCount(type, 3), type).toBeGreaterThan(trimCount(type, 0));
    }
    // The horses and the elephant take their later decoration on the chest and the crown.
    const names = (type: string, tier: number): string[] => {
      const scene = createPrimitiveUnitScene(type, { tier }), found: string[] = [];
      scene.traverse((object: { name: string }) => found.push(object.name));
      packUnitAsset(scene); return found;
    };
    expect(names('knight', 1)).not.toContain('Trim chest band');
    expect(names('knight', 2)).toContain('Trim chest band');
    expect(names('knight', 2)).not.toContain('Owner chest cloth');
    expect(names('knight', 3)).toContain('Owner chest cloth');
    expect(names('warElephant', 2)).toContain('Trim elephant plume');
    // A piece no technology opens takes the age of its column, so a leader's knight is as rich as a knight.
    expect(unitDecorationTier('gendarme')).toBe(unitDecorationTier('knight'));
    expect(unitDecorationTier('warrior')).toBe(0);
    for (const type of implemented) { expect(unitDecorationTier(type)).toBeGreaterThanOrEqual(0); expect(unitDecorationTier(type)).toBeLessThanOrEqual(3); }
  });

  it('keeps fixed ivory and gilt separate from owner enamel and from the second colour on every triangle', () => {
    const kit = make(), ivory = new Color('#e8d8b2'), gold = new Color('#b69045');
    for (const type of implemented) {
      const geometry = kit.resolve({ type })!.geometry, color = geometry.getAttribute('color'), owner = geometry.getAttribute('paintedOwner');
      const fixedColors = new Set<string>(), ownerColors = new Set<string>();
      const key = (r: number, g: number, b: number) => [r, g, b].map(value => value.toFixed(5)).join(',');
      expect(owner.count).toBe(color.count);
      for (let i = 0; i < color.count; i++) {
        const mask = owner.getX(i); expect(mask === 0 || mask === 1 || mask === 2).toBe(true);
        // A part in the second colour is packed white: the seat's colour is the whole of its pigment.
        if (mask === 2) expect(key(color.getX(i), color.getY(i), color.getZ(i))).toBe(key(1, 1, 1));
        else (mask ? ownerColors : fixedColors).add(key(color.getX(i), color.getY(i), color.getZ(i)));
      }
      expect(fixedColors.has(key(ivory.r, ivory.g, ivory.b))).toBe(true);
      // Tool fittings stay gilt. The first age's warrior has none: its club is wood with ivory bindings, and its
      // plinth, hem and brow band are in the second colour.
      expect(fixedColors.has(key(gold.r, gold.g, gold.b)), type).toBe(type !== 'warrior');
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
      const source = packSource('greatPerson', family);
      try {
        expect([...model.geometry.getAttribute('position').array]).toEqual(sourceParts(source).flatMap(part => [...part.getAttribute('position').array]));
      } finally { for (const part of sourceParts(source)) part.dispose(); }
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
      // Both pieces have parts in the second colour, so the mix names it. With one colour given, it is the first colour.
      expect(shader.fragmentShader.match(/diffuseColor.rgb \*= vPaintedOwner > 1.5 \? paintedUnitTrimColor : mix\(vec3\(1.0\), paintedUnitBodyColor, vPaintedOwner\);/g)).toHaveLength(1);
      expect(shader.uniforms.paintedUnitTrimColor.value).toEqual(new Color(0x294979));
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
